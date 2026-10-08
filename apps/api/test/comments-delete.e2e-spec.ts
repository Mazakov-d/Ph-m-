import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Deleting a comment (e2e, SPEC §6)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let author: { id: string; accessToken: string };
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
    author = await signUp(app, prisma, "lea");
  });

  afterAll(async () => {
    await app.close();
  });

  const remove = (token: string, commentId: string) =>
    request(app.getHttpServer())
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);

  it("deletes logically: the comment stays in the database (ROADMAP phase 5)", async () => {
    const comment = await writeComment(app, author.accessToken, postId, "À supprimer");
    const response = await remove(author.accessToken, comment.id).expect(200);
    expect(response.body).toMatchObject({ status: "DELETED", content: null });

    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(stored).toMatchObject({
      status: "DELETED",
      deletedBy: "AUTHOR",
      content: "À supprimer",
    });
    expect(stored.deletedAt).toBeInstanceOf(Date);
  });

  it("refuses a comment under review with an explicit error (ROADMAP phase 5)", async () => {
    const comment = await writeComment(app, author.accessToken, postId, "Signalé");
    await prisma.comment.update({ where: { id: comment.id }, data: { status: "UNDER_REVIEW" } });
    const response = await remove(author.accessToken, comment.id).expect(409);
    expect(response.body).toEqual({
      code: "COMMENT_UNDER_REVIEW",
      message: "A comment under review cannot be deleted",
    });
    const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(stored.deletedAt).toBeNull();
  });

  it("deletes a VERIFIED comment", async () => {
    const comment = await writeComment(app, author.accessToken, postId, "Conforme");
    await prisma.comment.update({ where: { id: comment.id }, data: { status: "VERIFIED" } });
    await remove(author.accessToken, comment.id).expect(200);
  });

  it.each(["REMOVED", "DELETED"] as const)("refuses a %s comment", async (status) => {
    const comment = await writeComment(app, author.accessToken, postId, "Déjà traité");
    await prisma.comment.update({ where: { id: comment.id }, data: { status } });
    const response = await remove(author.accessToken, comment.id).expect(409);
    expect(response.body).toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
  });

  it("refuses someone else's comment", async () => {
    const comment = await writeComment(app, author.accessToken, postId, "À moi");
    const other = await signUp(app, prisma, "hugo");
    await remove(other.accessToken, comment.id).expect(403);
  });

  it("lets a suspended account delete its own comment (docs/DECISIONS.md)", async () => {
    const comment = await writeComment(app, author.accessToken, postId, "Avant suspension");
    await prisma.user.update({
      where: { id: author.id },
      data: { suspendedUntil: new Date(Date.now() + 60_000) },
    });
    await remove(author.accessToken, comment.id).expect(200);
  });

  it("keeps the replies of a deleted comment", async () => {
    const root = await writeComment(app, author.accessToken, postId, "Racine");
    const other = await signUp(app, prisma, "hugo");
    await writeComment(app, other.accessToken, postId, "Réponse", root.id);
    await remove(author.accessToken, root.id).expect(200);
    const list = await request(app.getHttpServer()).get(`/posts/${postId}/comments`).expect(200);
    expect(list.body.items[0]).toMatchObject({ status: "DELETED", content: null });
    expect(list.body.items[0].replies[0]).toMatchObject({ content: "Réponse" });
  });

  it("never deletes a comment that goes under review at the same moment (concurrency)", async () => {
    const ROUNDS = 25;
    for (let round = 0; round < ROUNDS; round++) {
      const comment = await writeComment(app, author.accessToken, postId, `Course ${round}`);
      // The phase 8 report threshold will move VISIBLE → UNDER_REVIEW with a conditional update.
      const [deletion] = await Promise.all([
        remove(author.accessToken, comment.id),
        prisma.comment.updateMany({
          where: { id: comment.id, status: "VISIBLE" },
          data: { status: "UNDER_REVIEW" },
        }),
      ]);
      const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
      if (deletion.status === 200) {
        expect(stored).toMatchObject({ status: "DELETED" });
      } else {
        expect(deletion.body).toMatchObject({ code: "COMMENT_UNDER_REVIEW" });
        expect(stored).toMatchObject({ status: "UNDER_REVIEW", deletedAt: null });
      }
    }
  });
});
