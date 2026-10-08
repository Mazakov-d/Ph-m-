import type { INestApplication } from "@nestjs/common";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { sendComment, writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Writing comments (e2e, SPEC §6)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reader: { id: string; accessToken: string };
  let postId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    ({ id: postId } = await publishPost(app, editor.accessToken));
    reader = await signUp(app, prisma, "lea");
  });

  afterAll(async () => {
    await app.close();
  });

  it("publishes a comment signed with the pseudo", async () => {
    const comment = await writeComment(
      app,
      reader.accessToken,
      postId,
      "  Merci pour les sources.  ",
    );
    expect(comment).toMatchObject({
      postId,
      parentId: null,
      authorId: reader.id,
      authorPseudo: "lea",
      content: "Merci pour les sources.",
      status: "VISIBLE",
    });
  });

  it("publishes a reply to a root comment", async () => {
    const root = await writeComment(app, reader.accessToken, postId, "Question ?");
    const reply = await writeComment(app, reader.accessToken, postId, "Réponse.", root.id);
    expect(reply.parentId).toBe(root.id);
  });

  it("refuses a reply to a reply (one level, SPEC §6)", async () => {
    const root = await writeComment(app, reader.accessToken, postId, "Question ?");
    const reply = await writeComment(app, reader.accessToken, postId, "Réponse.", root.id);
    const response = await sendComment(app, reader.accessToken, postId, "Encore.", reply.id).expect(
      400,
    );
    expect(response.body).toMatchObject({ code: "INVALID_PARENT_COMMENT" });
  });

  it("refuses a reply to a comment of another post", async () => {
    const editor = await signUp(app, prisma, "autre", {
      role: "EDITOR",
      editorStatus: "CERTIFIED",
    });
    const otherPost = await publishPost(app, editor.accessToken);
    const root = await writeComment(app, reader.accessToken, otherPost.id, "Ailleurs.");
    await sendComment(app, reader.accessToken, postId, "Réponse.", root.id).expect(400);
  });

  it("refuses a reply to a deleted comment", async () => {
    const root = await writeComment(app, reader.accessToken, postId, "Question ?");
    await prisma.comment.update({
      where: { id: root.id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    await sendComment(app, reader.accessToken, postId, "Réponse.", root.id).expect(400);
  });

  it("refuses a comment on a post whose comments are disabled", async () => {
    const editor = await signUp(app, prisma, "fermee", {
      role: "EDITOR",
      editorStatus: "CERTIFIED",
    });
    const closed = await publishPost(app, editor.accessToken, {
      ...ARTICLE,
      commentsEnabled: false,
    });
    const response = await sendComment(app, reader.accessToken, closed.id, "Bonjour").expect(409);
    expect(response.body).toMatchObject({ code: "COMMENTS_DISABLED" });
  });

  it("answers 404 for an unknown post", async () => {
    await sendComment(
      app,
      reader.accessToken,
      "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      "Bonjour",
    ).expect(404);
  });

  it("validates the content (empty, too long)", async () => {
    await sendComment(app, reader.accessToken, postId, "   ").expect(400);
    await sendComment(app, reader.accessToken, postId, "a".repeat(2001)).expect(400);
  });

  it("refuses an anonymous visitor", async () => {
    const { default: request } = await import("supertest");
    await request(app.getHttpServer())
      .post("/comments")
      .send({ postId, parentId: null, content: "Hé" })
      .expect(401);
  });

  it("refuses a suspended account (SPEC §6.3)", async () => {
    const suspended = await signUp(app, prisma, "suspendu", {
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    const response = await sendComment(app, suspended.accessToken, postId, "Bonjour").expect(403);
    expect(response.body).toMatchObject({ code: "ACCOUNT_RESTRICTED" });
  });
});
