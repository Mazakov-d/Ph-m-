import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { TicketTimeoutJob } from "../src/tickets/ticket-timeout.job.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { signUp } from "./support/users.js";

type Account = { id: string; accessToken: string };
const HOUR = 60 * 60 * 1000;

describe("Support and chats (e2e, SPEC §8)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reader: Account;
  let moderator: Account;
  let otherModerator: Account;
  let admin: Account;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    reader = await signUp(app, prisma, "lecteur");
    moderator = await signUp(app, prisma, "modo-alice", { role: "MODERATOR" });
    otherModerator = await signUp(app, prisma, "modo-bruno", { role: "MODERATOR" });
    admin = await signUp(app, prisma, "direction", { role: "ADMIN" });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const as = (account: Account, call: request.Test) =>
    call.set("Authorization", `Bearer ${account.accessToken}`);
  const openTicket = async (
    account: Account = reader,
    content = "Mon compte a été suspendu à tort.",
  ) => {
    const response = await as(account, server().post("/tickets")).send({ content }).expect(201);
    return response.body.id as string;
  };
  const assign = (account: Account, id: string) =>
    as(account, server().post(`/moderation/tickets/${id}/assign`));
  const list = async (account: Account, scope: string) =>
    (await as(account, server().get(`/moderation/tickets?scope=${scope}`)).expect(200)).body as {
      id: string;
    }[];
  const send = (account: Account, id: string, content: string) =>
    as(account, server().post(`/tickets/${id}/messages`)).send({ content });

  it("opens a SUPPORT ticket shown to all moderators while NEW, with its first message", async () => {
    const id = await openTicket();
    const tickets = await list(moderator, "unassigned");
    expect(tickets).toMatchObject([
      {
        id,
        status: "NEW",
        openedByPseudo: "lecteur",
        firstMessage: "Mon compte a été suspendu à tort.",
      },
    ]);
    const mine = await as(reader, server().get("/tickets/mine")).expect(200);
    expect(mine.body).toMatchObject([{ id, kind: "SUPPORT" }]);
  });

  it("lets a suspended account contact the team, but not a moderator (matrix §2.5)", async () => {
    await prisma.user.update({
      where: { id: reader.id },
      data: { suspendedUntil: new Date(Date.now() + HOUR) },
    });
    await openTicket();
    await as(moderator, server().post("/tickets")).send({ content: "Moi ?" }).expect(403);
  });

  it("assigns atomically: two simultaneous assignments, only one wins (ROADMAP phase 9)", async () => {
    const id = await openTicket();
    const statuses = await Promise.all([assign(moderator, id), assign(otherModerator, id)]).then(
      (responses) => responses.map((response) => response.status).sort(),
    );
    expect(statuses).toEqual([201, 409]);
  });

  it("hides a ticket assigned to another moderator (ROADMAP phase 9)", async () => {
    const id = await openTicket();
    await assign(moderator, id).expect(201);
    expect(await list(otherModerator, "unassigned")).toEqual([]);
    expect(await list(otherModerator, "mine")).toEqual([]);
    expect((await list(moderator, "mine")).map((ticket) => ticket.id)).toEqual([id]);
    await as(otherModerator, server().get(`/tickets/${id}/messages`)).expect(404);
    await send(otherModerator, id, "Bonjour").expect(404);
  });

  it("carries the conversation, append-only, and closes it", async () => {
    const id = await openTicket();
    await assign(moderator, id).expect(201);
    await send(moderator, id, "Bonjour, je regarde votre dossier.").expect(201);
    await send(reader, id, "Merci !").expect(201);
    const messages = await as(reader, server().get(`/tickets/${id}/messages`)).expect(200);
    expect(
      messages.body.map((m: { content: string; fromTeam: boolean }) => [m.content, m.fromTeam]),
    ).toEqual([
      ["Mon compte a été suspendu à tort.", false],
      ["Bonjour, je regarde votre dossier.", true],
      ["Merci !", false],
    ]);
    const messageId = messages.body[0].id;
    await as(reader, server().patch(`/tickets/${id}/messages/${messageId}`))
      .send({ content: "x" })
      .expect(404);
    await as(reader, server().delete(`/tickets/${id}/messages/${messageId}`)).expect(404);

    await as(moderator, server().post(`/moderation/tickets/${id}/close`)).expect(201);
    const closed = await send(reader, id, "Encore une question").expect(409);
    expect(closed.body).toMatchObject({ code: "TICKET_CLOSED" });
  });

  it("opens an editor chat assigned to its moderator, seen by the editor", async () => {
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    const response = await as(moderator, server().post("/moderation/editor-chats"))
      .send({ editorId: editor.id, content: "Au sujet du signalement de votre article…" })
      .expect(201);
    expect(response.body).toMatchObject({
      kind: "EDITOR_CHAT",
      status: "ASSIGNED",
      editorPseudo: "clara",
    });
    const mine = await as(editor, server().get("/tickets/mine")).expect(200);
    expect(mine.body).toHaveLength(1);
    await send(editor, response.body.id, "Bien reçu.").expect(201);
    await as(moderator, server().post("/moderation/editor-chats"))
      .send({ editorId: reader.id, content: "Pas un éditeur" })
      .expect(400);
  });

  it("goes back to NEW after 24 hours without a message of its moderator (SPEC §8)", async () => {
    const quiet = await openTicket();
    const active = await openTicket(reader, "Autre question");
    await assign(moderator, quiet).expect(201);
    await assign(moderator, active).expect(201);
    await send(moderator, active, "Je m'en occupe.").expect(201);
    await prisma.ticket.update({
      where: { id: quiet },
      data: { assignedAt: new Date(Date.now() - 25 * HOUR) },
    });
    await prisma.ticket.update({
      where: { id: active },
      data: {
        assignedAt: new Date(Date.now() - 25 * HOUR),
        lastModeratorMessageAt: new Date(Date.now() - 23 * HOUR),
      },
    });

    expect(await app.get(TicketTimeoutJob).run()).toBe(1);
    expect((await list(otherModerator, "unassigned")).map((ticket) => ticket.id)).toEqual([quiet]);
    expect((await list(moderator, "mine")).map((ticket) => ticket.id)).toEqual([active]);
  });

  it("lets an admin read every conversation, each reading audited (SPEC §2.4)", async () => {
    const id = await openTicket();
    const all = await as(admin, server().get("/admin/tickets")).expect(200);
    expect(all.body.map((ticket: { id: string }) => ticket.id)).toEqual([id]);
    await as(admin, server().get(`/tickets/${id}/messages`)).expect(200);
    await as(admin, server().get(`/tickets/${id}/messages`)).expect(200);
    const logs = await as(admin, server().get("/admin/audit-logs")).expect(200);
    expect(
      logs.body.items.filter((log: { action: string }) => log.action === "ticket.read"),
    ).toHaveLength(2);
    expect(logs.body.items[0]).toMatchObject({ actorPseudo: "direction", targetId: id });
    await as(moderator, server().get("/admin/tickets")).expect(403);
    await as(moderator, server().get("/admin/audit-logs")).expect(403);
  });
});
