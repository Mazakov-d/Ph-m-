import type { INestApplication } from "@nestjs/common";
import { postPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Corrections by the editor (e2e, SPEC §3)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const editor = (pseudo: string) =>
    signUp(app, prisma, pseudo, { role: "EDITOR", editorStatus: "INDEPENDENT" });

  const correct = (token: string, postId: string, content: string) =>
    request(app.getHttpServer())
      .post(`/posts/${postId}/corrections`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content });

  it("lets the editor correct their own post at any time, without a verdict", async () => {
    const author = await editor("clara");
    const post = await publishPost(app, author.accessToken);
    await correct(author.accessToken, post.id, "Le chiffre exact est 3,2 %.").expect(201);

    const shown = await request(app.getHttpServer()).get(`/posts/${post.id}`).expect(200);
    expect(postPublicSchema.parse(shown.body).corrections).toMatchObject([
      { content: "Le chiffre exact est 3,2 %." },
    ]);
  });

  it("refuses a correction of another editor's post", async () => {
    const author = await editor("clara");
    const other = await editor("hugo");
    const post = await publishPost(app, author.accessToken);
    await correct(other.accessToken, post.id, "Pas mon article.").expect(403);
  });

  it("refuses a correction of a removed opinion", async () => {
    const author = await editor("clara");
    const post = await publishPost(app, author.accessToken);
    await prisma.post.update({ where: { id: post.id }, data: { removedAt: new Date() } });
    await correct(author.accessToken, post.id, "Trop tard.").expect(410);
  });
});
