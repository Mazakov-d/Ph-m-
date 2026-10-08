import type { INestApplication } from "@nestjs/common";
import { reviewPublicSchema, type ReviewPublic } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { readerAged, reportPost } from "./support/reports.js";
import { signUp } from "./support/users.js";

const HOUR = 60 * 60 * 1000;
const VERDICT = {
  verdict: "FALSE",
  publicNote: "Les chiffres cités ne correspondent pas à la source.",
  sources: ["https://www.insee.fr"],
};

describe("Article reviews (e2e, SPEC §5.4–§5.6)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: { id: string; accessToken: string };
  let moderator: { id: string; accessToken: string };
  let otherModerator: { id: string; accessToken: string };
  let reporters: { id: string; accessToken: string }[];
  let postId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    editor = await signUp(app, prisma, "clara", { role: "EDITOR", editorStatus: "INDEPENDENT" });
    moderator = await signUp(app, prisma, "modo-alice", { role: "MODERATOR" });
    otherModerator = await signUp(app, prisma, "modo-bruno", { role: "MODERATOR" });
    ({ id: postId } = await publishPost(app, editor.accessToken));
    // Five regular readers open the review (SPEC §5.3).
    reporters = [];
    for (const pseudo of ["lecteur1", "lecteur2", "lecteur3", "lecteur4", "lecteur5"]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, postId).expect(201);
      reporters.push(reader);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const asUser = (token: string, call: request.Test) =>
    call.set("Authorization", `Bearer ${token}`);
  const decide = (token: string, body: object = VERDICT, id = postId) =>
    asUser(token, server().post(`/moderation/post-reviews/${id}/verdict`)).send(body);
  const editorAction = (path: string, body: object, token = editor.accessToken) =>
    asUser(token, server().post(`/posts/${postId}/${path}`)).send(body);
  const reporterCounters = () =>
    prisma.user.findMany({
      where: { id: { in: reporters.map((reader) => reader.id) } },
      select: { upheldReportCount: true, dismissedReportCount: true },
    });

  describe("queue (SPEC §5.4)", () => {
    it("lists the articles under review with their score, highest priority first", async () => {
      const busy = await publishPost(app, editor.accessToken);
      await prisma.post.update({ where: { id: busy.id }, data: { viewCount: 300 } });
      for (const pseudo of ["autre1", "autre2", "autre3", "autre4", "autre5"]) {
        const reader = await readerAged(app, prisma, pseudo, 90);
        await reportPost(app, reader.accessToken, busy.id).expect(201);
      }
      const response = await asUser(
        moderator.accessToken,
        server().get("/moderation/post-reviews"),
      ).expect(200);
      expect(response.body.map((item: { post: { id: string } }) => item.post.id)).toEqual([
        busy.id,
        postId,
      ]);
      expect(response.body[1]).toMatchObject({ score: 5, viewCount: 0 });
      expect(response.body[1].reports).toHaveLength(5);
    });

    it("leaves out the files the moderator has a conflict with (SPEC §2.3)", async () => {
      await prisma.user.update({
        where: { id: moderator.id },
        data: { conflictEditorIds: [editor.id] },
      });
      const response = await asUser(
        moderator.accessToken,
        server().get("/moderation/post-reviews"),
      ).expect(200);
      expect(response.body).toEqual([]);
      await decide(moderator.accessToken).expect(403);
    });

    it("is reserved to moderators", async () => {
      await asUser(
        reporters[0]?.accessToken ?? "",
        server().get("/moderation/post-reviews"),
      ).expect(403);
    });
  });

  describe("verdict (SPEC §5.5)", () => {
    it("closes the reports as UPHELD, credits the reporters, audits, and shows « Pourquoi ? »", async () => {
      const response = await decide(moderator.accessToken).expect(201);
      expect(reviewPublicSchema.parse(response.body)).toMatchObject({
        verdict: "FALSE",
        appealState: "NONE",
      });

      const post = await server().get(`/posts/${postId}`).expect(200);
      expect(post.body).toMatchObject({
        reviewStatus: "REVIEWED",
        verdict: "FALSE",
        reportCount: 5,
      });
      expect(await prisma.postReport.count({ where: { status: "UPHELD" } })).toBe(5);
      expect(await reporterCounters()).toEqual(
        Array(5).fill({ upheldReportCount: 1, dismissedReportCount: 0 }),
      );
      expect(await prisma.auditLog.count({ where: { action: "post.verdict" } })).toBe(1);

      const why = await server().get(`/posts/${postId}/review`).expect(200);
      expect(why.body).toMatchObject({ publicNote: VERDICT.publicNote, sources: VERDICT.sources });
    });

    it("closes the reports as DISMISSED for an ACCURATE article", async () => {
      await decide(moderator.accessToken, { ...VERDICT, verdict: "ACCURATE" }).expect(201);
      expect(await prisma.postReport.count({ where: { status: "DISMISSED" } })).toBe(5);
      expect(await reporterCounters()).toEqual(
        Array(5).fill({ upheldReportCount: 0, dismissedReportCount: 1 }),
      );
    });

    it("requires a public note and a source", async () => {
      await decide(moderator.accessToken, { ...VERDICT, publicNote: "" }).expect(400);
      await decide(moderator.accessToken, { ...VERDICT, sources: [] }).expect(400);
    });

    it("lets only one of two simultaneous verdicts through", async () => {
      const statuses = await Promise.all([
        decide(moderator.accessToken),
        decide(otherModerator.accessToken, { ...VERDICT, verdict: "ACCURATE" }),
      ]).then((responses) => responses.map((response) => response.status).sort());
      expect(statuses).toEqual([201, 409]);
      expect(await prisma.review.count()).toBe(1);
    });

    it("refuses an article that is not under review", async () => {
      const calm = await publishPost(app, editor.accessToken);
      const response = await decide(moderator.accessToken, VERDICT, calm.id).expect(409);
      expect(response.body).toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    });
  });

  describe("the editor's answers, within 48 hours (SPEC §5.5)", () => {
    beforeEach(async () => {
      await decide(moderator.accessToken).expect(201);
    });

    const ageVerdict = (hours: number) =>
      prisma.review.updateMany({ data: { createdAt: new Date(Date.now() - hours * HOUR) } });

    it("publishes one reply, shown under the note", async () => {
      await editorAction("review/reply", { content: "Nos chiffres datent de 2024." }).expect(201);
      const why = await server().get(`/posts/${postId}/review`).expect(200);
      expect(why.body.editorReply).toMatchObject({ content: "Nos chiffres datent de 2024." });
      const again = await editorAction("review/reply", { content: "Encore." }).expect(409);
      expect(again.body).toMatchObject({ code: "ALREADY_REPLIED" });
    });

    it("publishes a correction under the article", async () => {
      await editorAction("corrections", { content: "Le chiffre exact est 3,2 %." }).expect(201);
      const post = await server().get(`/posts/${postId}`).expect(200);
      expect(post.body.corrections).toMatchObject([{ content: "Le chiffre exact est 3,2 %." }]);
    });

    it("still accepts a correction after 48 hours (SPEC §3: at any time)", async () => {
      await ageVerdict(49);
      await editorAction("corrections", { content: "Précision tardive." }).expect(201);
    });

    it("closes the window after 48 hours", async () => {
      await ageVerdict(49);
      const reply = await editorAction("review/reply", { content: "Trop tard." }).expect(409);
      expect(reply.body).toMatchObject({ code: "REPLY_WINDOW_CLOSED" });
      const appeal = await editorAction("review/appeal", { reason: "Trop tard." }).expect(409);
      expect(appeal.body).toMatchObject({ code: "APPEAL_WINDOW_CLOSED" });
    });

    it("refuses another editor", async () => {
      const other = await signUp(app, prisma, "autre", {
        role: "EDITOR",
        editorStatus: "CERTIFIED",
      });
      await editorAction("review/reply", { content: "Moi ?" }, other.accessToken).expect(403);
    });
  });

  describe("appeal (SPEC §5.5)", () => {
    let appealId: string;

    beforeEach(async () => {
      await decide(moderator.accessToken).expect(201);
      const response = await editorAction("review/appeal", {
        reason: "Notre source est officielle.",
      });
      expect(response.status).toBe(201);
      expect((response.body as ReviewPublic).appealState).toBe("PENDING");
      appealId = (await prisma.appeal.findFirstOrThrow()).id;
    });

    const decideAppeal = (token: string, verdict = "ACCURATE") =>
      asUser(token, server().post(`/moderation/appeals/${appealId}/decision`)).send({
        ...VERDICT,
        verdict,
      });

    it("is used only once", async () => {
      const again = await editorAction("review/appeal", { reason: "Encore." }).expect(409);
      expect(again.body).toMatchObject({ code: "APPEAL_ALREADY_USED" });
    });

    it("cannot be handled by the moderator who gave the verdict (ROADMAP phase 7)", async () => {
      const list = await asUser(moderator.accessToken, server().get("/moderation/appeals")).expect(
        200,
      );
      expect(list.body).toEqual([]);
      const response = await decideAppeal(moderator.accessToken).expect(403);
      expect(response.body).toMatchObject({ code: "SAME_MODERATOR_APPEAL" });
    });

    it("is decided by another moderator; a reversed verdict corrects reports and counters", async () => {
      const list = await asUser(
        otherModerator.accessToken,
        server().get("/moderation/appeals"),
      ).expect(200);
      expect(list.body).toMatchObject([{ id: appealId, reason: "Notre source est officielle." }]);

      const response = await decideAppeal(otherModerator.accessToken, "ACCURATE").expect(201);
      expect(response.body).toMatchObject({ verdict: "ACCURATE", appealState: "DECIDED" });
      expect(await prisma.postReport.count({ where: { status: "DISMISSED" } })).toBe(5);
      expect(await reporterCounters()).toEqual(
        Array(5).fill({ upheldReportCount: 0, dismissedReportCount: 1 }),
      );
      const post = await server().get(`/posts/${postId}`).expect(200);
      expect(post.body.verdict).toBe("ACCURATE");

      const second = await editorAction("review/appeal", { reason: "Et encore." }).expect(409);
      expect(second.body).toMatchObject({ code: "APPEAL_ALREADY_USED" });
      await decideAppeal(otherModerator.accessToken).expect(409);
    });

    it("keeps reports and counters when the verdict stays non-accurate", async () => {
      await decideAppeal(otherModerator.accessToken, "MISLEADING").expect(201);
      expect(await prisma.postReport.count({ where: { status: "UPHELD" } })).toBe(5);
      expect(await reporterCounters()).toEqual(
        Array(5).fill({ upheldReportCount: 1, dismissedReportCount: 0 }),
      );
    });
  });
});
