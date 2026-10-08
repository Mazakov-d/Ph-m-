import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

// SPEC §6: comments are never modifiable; ROADMAP phase 5: no such route exists.
describe("No route modifies a comment (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(["patch", "put"] as const)(
    "answers 404 to %s and leaves the comment unchanged",
    async (method) => {
      const editor = await signUp(app, prisma, `clara-${method}`, {
        role: "EDITOR",
        editorStatus: "INDEPENDENT",
      });
      const post = await publishPost(app, editor.accessToken);
      const author = await signUp(app, prisma, `lea-${method}`);
      const comment = await writeComment(app, author.accessToken, post.id, "Texte d'origine");

      await request(app.getHttpServer())
        [method](`/comments/${comment.id}`)
        .set("Authorization", `Bearer ${author.accessToken}`)
        .send({ content: "Texte modifié" })
        .expect(404);
      const stored = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
      expect(stored.content).toBe("Texte d'origine");
    },
  );
});
