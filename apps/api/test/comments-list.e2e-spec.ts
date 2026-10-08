import type { INestApplication } from "@nestjs/common";
import { commentThreadPublicSchema, paginated } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

const threadsPage = paginated(commentThreadPublicSchema);

describe("Listing comments (e2e, SPEC §6)", () => {
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

  async function list(query = "") {
    const response = await request(app.getHttpServer())
      .get(`/posts/${postId}/comments${query}`)
      .expect(200);
    return threadsPage.parse(response.body);
  }

  it("is readable without an account, oldest first, replies under their root", async () => {
    const first = await writeComment(app, reader.accessToken, postId, "Premier");
    const second = await writeComment(app, reader.accessToken, postId, "Second");
    await writeComment(app, reader.accessToken, postId, "Réponse au premier", first.id);

    const page = await list();
    expect(page.items.map((thread) => thread.content)).toEqual(["Premier", "Second"]);
    expect(page.items[0]?.replies.map((reply) => reply.content)).toEqual(["Réponse au premier"]);
    expect(page.items[1]?.id).toBe(second.id);
    expect(page.items[1]?.replies).toEqual([]);
  });

  it.each(["UNDER_REVIEW", "REMOVED", "DELETED"] as const)(
    "hides the content of a %s comment but keeps its place and replies",
    async (status) => {
      const root = await writeComment(app, reader.accessToken, postId, "Contenu caché");
      await writeComment(app, reader.accessToken, postId, "Réponse visible", root.id);
      await prisma.comment.update({ where: { id: root.id }, data: { status } });

      const [thread] = (await list()).items;
      expect(thread).toMatchObject({ id: root.id, status, content: null });
      expect(thread?.replies[0]?.content).toBe("Réponse visible");
    },
  );

  it("shows a VERIFIED comment", async () => {
    const root = await writeComment(app, reader.accessToken, postId, "Conforme");
    await prisma.comment.update({ where: { id: root.id }, data: { status: "VERIFIED" } });
    expect((await list()).items[0]).toMatchObject({ status: "VERIFIED", content: "Conforme" });
  });

  it("pages through the threads with a cursor", async () => {
    for (const content of ["Un", "Deux", "Trois"]) {
      await writeComment(app, reader.accessToken, postId, content);
    }
    const first = await list("?limit=2");
    expect(first.items.map((thread) => thread.content)).toEqual(["Un", "Deux"]);
    const second = await list(`?limit=2&cursor=${first.nextCursor}`);
    expect(second.items.map((thread) => thread.content)).toEqual(["Trois"]);
    expect(second.nextCursor).toBeNull();
  });

  it("answers 404 for an unknown post", async () => {
    await request(app.getHttpServer())
      .get("/posts/0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11/comments")
      .expect(404);
  });
});
