import type { INestApplication } from "@nestjs/common";
import { type SanctionPublic, sanctionPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { sendComment, writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { readerAged } from "./support/reports.js";
import { signUp } from "./support/users.js";

type Account = { id: string; accessToken: string };

describe("Comment moderation and sanctions (e2e, SPEC §6.2, §6.3, §10)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: Account;
  let moderator: Account;
  let otherModerator: Account;
  let author: Account;
  let reporters: Account[];
  let postId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    editor = await signUp(app, prisma, "clara", { role: "EDITOR", editorStatus: "INDEPENDENT" });
    moderator = await signUp(app, prisma, "modo-alice", { role: "MODERATOR" });
    otherModerator = await signUp(app, prisma, "modo-bruno", { role: "MODERATOR" });
    author = await readerAged(app, prisma, "auteur", 90);
    reporters = [];
    for (const pseudo of ["lecteur1", "lecteur2", "lecteur3"]) {
      reporters.push(await readerAged(app, prisma, pseudo, 90));
    }
    ({ id: postId } = await publishPost(app, editor.accessToken));
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const as = (account: Account, call: request.Test) =>
    call.set("Authorization", `Bearer ${account.accessToken}`);
  const reportComment = (account: Account, commentId: string, reason = "INSULT") =>
    as(account, server().post(`/comments/${commentId}/reports`)).send({ reason, details: null });
  const decide = (account: Account, commentId: string, body: object) =>
    as(account, server().post(`/moderation/comments/${commentId}/decision`)).send(body);
  const statusOf = async (commentId: string) =>
    (await prisma.comment.findUniqueOrThrow({ where: { id: commentId } })).status;

  /** A comment by `author`, put under review by three regular readers (3 × 1.0 = threshold). */
  async function commentUnderReview(text = "Commentaire signalé"): Promise<string> {
    const comment = await writeComment(app, author.accessToken, postId, text);
    for (const reporter of reporters) {
      await reportComment(reporter, comment.id).expect(201);
    }
    return comment.id;
  }

  const REMOVE = { decision: "REMOVED", isDiscrimination: false, reportToPharos: false };

  describe("reports (SPEC §6.2)", () => {
    it("hides a comment once the weights reach 3, not before", async () => {
      const comment = await writeComment(app, author.accessToken, postId, "Bof");
      await reportComment(reporters[0] as Account, comment.id).expect(201);
      await reportComment(reporters[1] as Account, comment.id).expect(201);
      expect(await statusOf(comment.id)).toBe("VISIBLE");
      await reportComment(reporters[2] as Account, comment.id).expect(201);
      expect(await statusOf(comment.id)).toBe("UNDER_REVIEW");
    });

    it("needs more reports from new accounts (0.2 each)", async () => {
      const comment = await writeComment(app, author.accessToken, postId, "Bof");
      for (const pseudo of ["nouveau1", "nouveau2", "nouveau3", "nouveau4"]) {
        await reportComment(await readerAged(app, prisma, pseudo, 2), comment.id).expect(201);
      }
      expect(await statusOf(comment.id)).toBe("VISIBLE");
    });

    it("refuses a second report, one's own comment, and a VERIFIED comment", async () => {
      const comment = await writeComment(app, author.accessToken, postId, "Bof");
      await reportComment(reporters[0] as Account, comment.id).expect(201);
      await reportComment(reporters[0] as Account, comment.id).expect(409);
      await reportComment(author, comment.id).expect(403);
      await prisma.comment.update({ where: { id: comment.id }, data: { status: "VERIFIED" } });
      const response = await reportComment(reporters[1] as Account, comment.id).expect(409);
      expect(response.body).toMatchObject({ code: "COMMENT_ALREADY_VERIFIED" });
    });
  });

  describe("decisions (SPEC §6.2 step 4)", () => {
    it("lists the comments under review with their content for moderators", async () => {
      const commentId = await commentUnderReview("Contenu à juger");
      const response = await as(moderator, server().get("/moderation/comments")).expect(200);
      expect(response.body).toMatchObject([
        { id: commentId, content: "Contenu à juger", reportCount: 3, totalReportWeight: 3 },
      ]);
    });

    it("VERIFIED: shown again with the badge, reports dismissed, no sanction", async () => {
      const commentId = await commentUnderReview();
      const response = await decide(moderator, commentId, { decision: "VERIFIED" }).expect(201);
      expect(response.body).toEqual({ sanction: null });
      expect(await statusOf(commentId)).toBe("VERIFIED");
      expect(await prisma.commentReport.count({ where: { status: "DISMISSED" } })).toBe(3);
      const list = await server().get(`/posts/${postId}/comments`).expect(200);
      expect(list.body.items[0]).toMatchObject({
        status: "VERIFIED",
        content: "Commentaire signalé",
      });
    });

    it("REMOVED: kept logically, reports upheld, sanction issued, audited, PHAROS flag kept", async () => {
      const commentId = await commentUnderReview();
      const response = await decide(moderator, commentId, {
        ...REMOVE,
        reportToPharos: true,
      }).expect(201);
      expect(response.body.sanction).toMatchObject({ type: "WARNING", commentId });
      const stored = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
      expect(stored).toMatchObject({ status: "REMOVED", deletedBy: "MODERATOR" });
      expect(await prisma.commentReport.count({ where: { status: "UPHELD" } })).toBe(3);
      expect(await prisma.sanction.findFirstOrThrow()).toMatchObject({ reportToPharos: true });
      expect(await prisma.auditLog.count({ where: { action: "comment.decision" } })).toBe(1);
    });

    it("4 removed comments give exactly: warning, 24 h, 7 days, ban (ROADMAP phase 8)", async () => {
      const types: string[] = [];
      for (const round of [1, 2, 3, 4]) {
        // The suspension of the previous round must not prevent writing the next comment.
        await prisma.user.update({ where: { id: author.id }, data: { suspendedUntil: null } });
        const commentId = await commentUnderReview(`Écart ${round}`);
        const response = await decide(moderator, commentId, REMOVE).expect(201);
        types.push(response.body.sanction.type);
      }
      expect(types).toEqual(["WARNING", "SUSPENSION_24H", "SUSPENSION_7D", "PERMANENT_BAN"]);
      const account = await prisma.user.findUniqueOrThrow({ where: { id: author.id } });
      expect(account.bannedAt).toBeInstanceOf(Date);
    });

    it("a confirmed discrimination bans at once (ROADMAP phase 8)", async () => {
      const commentId = await commentUnderReview();
      const response = await decide(moderator, commentId, {
        ...REMOVE,
        isDiscrimination: true,
      }).expect(201);
      expect(response.body.sanction.type).toBe("PERMANENT_BAN");
    });

    it("a suspended account can read but not comment, vote or report (ROADMAP phase 8)", async () => {
      await prisma.user.update({ where: { id: author.id }, data: { suspendedUntil: null } });
      const first = await commentUnderReview("Premier");
      await decide(moderator, first, REMOVE).expect(201);
      const second = await commentUnderReview("Second");
      await decide(moderator, second, REMOVE).expect(201); // 24 h suspension

      await server()
        .get(`/posts/${postId}`)
        .set("Authorization", `Bearer ${author.accessToken}`)
        .expect(200);
      await sendComment(app, author.accessToken, postId, "Encore").expect(403);
      const opinion = await publishPost(app, editor.accessToken, { ...ARTICLE, kind: "OPINION" });
      const optionId = opinion.votes?.options[0]?.id;
      await as(author, server().put(`/posts/${opinion.id}/vote`))
        .send({ optionId })
        .expect(403);
      await as(author, server().post(`/posts/${postId}/reports`))
        .send({ reason: "MISLEADING", details: null })
        .expect(403);
    });

    it("lets only one of two simultaneous decisions through", async () => {
      const commentId = await commentUnderReview();
      const statuses = await Promise.all([
        decide(moderator, commentId, { decision: "VERIFIED" }),
        decide(otherModerator, commentId, REMOVE),
      ]).then((responses) => responses.map((response) => response.status).sort());
      expect(statuses).toEqual([201, 409]);
    });

    it("hides the files the moderator has a conflict with", async () => {
      const commentId = await commentUnderReview();
      await prisma.user.update({
        where: { id: moderator.id },
        data: { conflictEditorIds: [author.id] },
      });
      const response = await as(moderator, server().get("/moderation/comments")).expect(200);
      expect(response.body).toEqual([]);
      await decide(moderator, commentId, REMOVE).expect(403);
    });
  });

  describe("appeal of a sanction (SPEC §6.3)", () => {
    let sanction: SanctionPublic;
    let commentId: string;

    beforeEach(async () => {
      commentId = await commentUnderReview();
      await decide(moderator, commentId, REMOVE).expect(201);
      const mine = await as(author, server().get("/sanctions/me")).expect(200);
      sanction = sanctionPublicSchema.parse(mine.body[0]);
    });

    it("shows the sanction to its author, who appeals it once", async () => {
      expect(sanction).toMatchObject({ type: "WARNING", appealState: "NONE" });
      const response = await as(author, server().post(`/sanctions/${sanction.id}/appeal`))
        .send({ reason: "C'était de l'ironie." })
        .expect(201);
      expect(response.body.appealState).toBe("PENDING");
      await as(author, server().post(`/sanctions/${sanction.id}/appeal`))
        .send({ reason: "Encore" })
        .expect(409);
    });

    it("cannot be decided by the moderator who issued the sanction", async () => {
      await as(author, server().post(`/sanctions/${sanction.id}/appeal`))
        .send({ reason: "Ironie" })
        .expect(201);
      const list = await as(moderator, server().get("/moderation/sanction-appeals")).expect(200);
      expect(list.body).toEqual([]);
      const appealId = (await prisma.appeal.findFirstOrThrow()).id;
      await as(moderator, server().post(`/moderation/sanction-appeals/${appealId}/decision`))
        .send({ accepted: true })
        .expect(403);
    });

    it("accepted by another moderator: lifted, restriction removed, comment VERIFIED", async () => {
      // Make it a suspension, to see the restriction lifted.
      await prisma.sanction.update({
        where: { id: sanction.id },
        data: { type: "SUSPENSION_24H", endsAt: new Date(Date.now() + 3_600_000) },
      });
      await prisma.user.update({
        where: { id: author.id },
        data: { suspendedUntil: new Date(Date.now() + 3_600_000) },
      });
      await as(author, server().post(`/sanctions/${sanction.id}/appeal`))
        .send({ reason: "Ironie" })
        .expect(201);
      const list = await as(otherModerator, server().get("/moderation/sanction-appeals")).expect(
        200,
      );
      expect(list.body).toMatchObject([{ reason: "Ironie", content: "Commentaire signalé" }]);

      const response = await as(
        otherModerator,
        server().post(`/moderation/sanction-appeals/${list.body[0].id}/decision`),
      )
        .send({ accepted: true })
        .expect(201);
      expect(response.body).toMatchObject({ appealState: "ACCEPTED" });
      expect(response.body.liftedAt).not.toBeNull();
      const account = await prisma.user.findUniqueOrThrow({ where: { id: author.id } });
      expect(account.suspendedUntil).toBeNull();
      expect(await statusOf(commentId)).toBe("VERIFIED");
    });
  });

  describe("reported opinions (docs/DECISIONS.md, SPEC §6.3)", () => {
    let opinionId: string;

    beforeEach(async () => {
      ({ id: opinionId } = await publishPost(app, editor.accessToken, {
        ...ARTICLE,
        kind: "OPINION",
      }));
      for (const reporter of reporters) {
        await as(reporter, server().post(`/posts/${opinionId}/reports`))
          .send({ reason: "OTHER", details: "Propos haineux" })
          .expect(201);
      }
    });

    const decidePost = (body: object) =>
      as(moderator, server().post(`/moderation/posts/${opinionId}/decision`)).send(body);

    it("lists the reported opinions", async () => {
      const response = await as(moderator, server().get("/moderation/posts")).expect(200);
      expect(response.body).toMatchObject([{ post: { id: opinionId }, score: 3 }]);
    });

    it("removes the opinion: out of the feed, gone by link, editor sanctioned", async () => {
      const response = await decidePost(REMOVE).expect(201);
      expect(response.body.sanction).toMatchObject({ type: "WARNING", postId: opinionId });
      const feed = await server().get("/posts").expect(200);
      expect(feed.body.items.map((post: { id: string }) => post.id)).not.toContain(opinionId);
      const detail = await server().get(`/posts/${opinionId}`).expect(410);
      expect(detail.body).toMatchObject({ code: "POST_REMOVED" });
      await sendComment(app, author.accessToken, opinionId, "Encore là ?").expect(410);
    });

    it("keeps a compliant opinion and dismisses the reports", async () => {
      await decidePost({ decision: "COMPLIANT" }).expect(201);
      expect(await prisma.postReport.count({ where: { status: "DISMISSED" } })).toBe(3);
      await server().get(`/posts/${opinionId}`).expect(200);
    });
  });

  describe("blocking (SPEC §10)", () => {
    it("hides the blocked user's posts and comments from the blocker only", async () => {
      const reader = reporters[0] as Account;
      await writeComment(app, author.accessToken, postId, "Du bloqué");
      await writeComment(app, reader.accessToken, postId, "Du lecteur");
      await as(reader, server().post(`/users/${author.id}/block`)).expect(201);
      await as(reader, server().post(`/users/${editor.id}/block`)).expect(201);

      const comments = await as(reader, server().get(`/posts/${postId}/comments`)).expect(200);
      expect(comments.body.items.map((c: { content: string }) => c.content)).toEqual([
        "Du lecteur",
      ]);
      const feed = await as(reader, server().get("/posts")).expect(200);
      expect(feed.body.items).toHaveLength(0);
      const anonymous = await server().get(`/posts/${postId}/comments`).expect(200);
      expect(anonymous.body.items).toHaveLength(2);

      const blocks = await as(reader, server().get("/users/me/blocks")).expect(200);
      expect(blocks.body.map((b: { blockedPseudo: string }) => b.blockedPseudo).sort()).toEqual([
        "auteur",
        "clara",
      ]);
      await as(reader, server().delete(`/users/${author.id}/block`)).expect(204);
      const after = await as(reader, server().get(`/posts/${postId}/comments`)).expect(200);
      expect(after.body.items).toHaveLength(2);
    });

    it("refuses to block oneself", async () => {
      await as(author, server().post(`/users/${author.id}/block`)).expect(400);
    });
  });
});
