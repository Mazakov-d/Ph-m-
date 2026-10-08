import { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { REALTIME_UNAUTHENTICATED_CLOSE_CODE, realtimeServerMessageSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import WebSocket from "ws";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { signUp } from "./support/users.js";

type Account = { id: string; accessToken: string };

describe("Real-time conversations (e2e, docs/DECISIONS.md)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let port: number;
  const sockets: WebSocket[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await app.listen(0);
    const server: unknown = app.getHttpServer();
    const address = server instanceof Server ? server.address() : null;
    if (!address || typeof address === "string") throw new Error("No port");
    port = address.port;
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.close();
  });

  afterAll(async () => {
    await app.close();
  });

  /** A connected client and the messages it received, parsed with the shared schema. */
  async function connect(token: string) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`);
    sockets.push(socket);
    const received: unknown[] = [];
    socket.on("message", (raw) =>
      received.push(realtimeServerMessageSchema.parse(JSON.parse(String(raw)))),
    );
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return { socket, received };
  }

  async function until(check: () => boolean) {
    for (let attempt = 0; attempt < 50 && !check(); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  async function openTicket(reader: Account): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/tickets")
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .send({ content: "Bonjour" })
      .expect(201);
    return response.body.id;
  }

  it("closes a connection without a valid access token", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=faux`);
    sockets.push(socket);
    const code = await new Promise<number>((resolve) =>
      socket.once("close", (closeCode) => resolve(closeCode)),
    );
    expect(code).toBe(REALTIME_UNAUTHENTICATED_CLOSE_CODE);
  });

  it("sends a new message at once to the participants who follow the conversation", async () => {
    const reader = await signUp(app, prisma, "lecteur");
    const ticketId = await openTicket(reader);
    const moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    await request(app.getHttpServer())
      .post(`/moderation/tickets/${ticketId}/assign`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .expect(201);

    const { socket, received } = await connect(reader.accessToken);
    socket.send(JSON.stringify({ event: "subscribe", data: { ticketId } }));
    await until(() => received.length > 0);
    expect(received[0]).toEqual({ event: "subscribed", data: { ticketId } });

    await request(app.getHttpServer())
      .post(`/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ content: "Nous regardons." })
      .expect(201);
    await until(() => received.length > 1);
    expect(received[1]).toMatchObject({
      event: "message",
      data: { ticketId, content: "Nous regardons.", fromTeam: true },
    });
  });

  it("never lets someone else follow the conversation", async () => {
    const reader = await signUp(app, prisma, "lecteur");
    const ticketId = await openTicket(reader);
    const stranger = await signUp(app, prisma, "curieux");
    const { socket, received } = await connect(stranger.accessToken);
    socket.send(JSON.stringify({ event: "subscribe", data: { ticketId } }));
    await until(() => received.length > 0);
    expect(received[0]).toEqual({ event: "error", data: { code: "NOT_FOUND" } });

    await request(app.getHttpServer())
      .post(`/tickets/${ticketId}/messages`)
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .send({ content: "Privé" })
      .expect(201);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).toHaveLength(1);
  });

  it("audits an ADMIN who follows a conversation (SPEC §2.4)", async () => {
    const reader = await signUp(app, prisma, "lecteur");
    const ticketId = await openTicket(reader);
    const admin = await signUp(app, prisma, "admin", { role: "ADMIN" });
    const { socket, received } = await connect(admin.accessToken);
    socket.send(JSON.stringify({ event: "subscribe", data: { ticketId } }));
    await until(() => received.length > 0);
    expect(received[0]).toEqual({ event: "subscribed", data: { ticketId } });
    expect(
      await prisma.auditLog.count({
        where: { actorId: admin.id, action: "ticket.read", targetId: ticketId },
      }),
    ).toBe(1);
  });
});
