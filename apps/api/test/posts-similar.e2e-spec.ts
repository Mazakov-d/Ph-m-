import type { INestApplication } from "@nestjs/common";
import { similarPostsPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

const DAY = 86_400_000;

describe("Similar posts (e2e, SPEC §9)", () => {
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

  async function editor(pseudo: string, ownerGroup: string | null = null) {
    const account = await signUp(app, prisma, pseudo, {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    await prisma.editorProfile.update({ where: { userId: account.id }, data: { ownerGroup } });
    return account;
  }

  const budget = (title: string) => ({
    ...ARTICLE,
    title,
    summary: "Les députés votent le budget de l'État.",
  });

  async function similarTo(postId: string, token?: string) {
    const call = request(app.getHttpServer()).get(`/posts/${postId}/similar`);
    if (token) call.set("Authorization", `Bearer ${token}`);
    const response = await call.expect(200);
    return similarPostsPublicSchema.parse(response.body);
  }

  it("finds the posts of other editors on the same subject, one per owner group", async () => {
    const author = await editor("auteur");
    const groupOne = await editor("groupe-un", "Groupe Média");
    const groupTwo = await editor("groupe-deux", "Groupe Média");
    const independent = await editor("independant");
    const source = await publishPost(app, author.accessToken, budget("Budget adopté"));
    await publishPost(app, author.accessToken, budget("Budget : le même auteur"));
    await publishPost(app, groupOne.accessToken, budget("Les députés adoptent le budget"));
    await publishPost(app, groupTwo.accessToken, budget("Budget de l'État voté"));
    await publishPost(app, independent.accessToken, budget("Vote du budget à l'Assemblée"));

    const result = await similarTo(source.id);
    // Three other editors talk about it; the two of the same group are shown once.
    expect(result.otherMediaCount).toBe(3);
    expect(result.posts).toHaveLength(2);
    expect(result.posts.every((post) => post.editor.id !== author.id)).toBe(true);
  });

  it("needs the same zone, theme and two words in common, within seven days", async () => {
    const author = await editor("auteur");
    const other = await editor("autre");
    const source = await publishPost(app, author.accessToken, budget("Budget adopté"));
    await publishPost(app, other.accessToken, { ...budget("Budget adopté"), zone: "EUROPE" });
    await publishPost(app, other.accessToken, { ...budget("Budget adopté"), theme: "ECONOMY" });
    await publishPost(app, other.accessToken, {
      ...ARTICLE,
      title: "Match de football",
      summary: "Le budget du club.",
    });
    const old = await publishPost(app, other.accessToken, budget("Budget adopté"));
    await prisma.post.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 8 * DAY) },
    });

    expect(await similarTo(source.id)).toEqual({ otherMediaCount: 0, posts: [] });
  });

  it("never suggests an editor the reader blocked (SPEC §10)", async () => {
    const author = await editor("auteur");
    const other = await editor("autre");
    const reader = await signUp(app, prisma, "lecteur");
    const source = await publishPost(app, author.accessToken, budget("Budget adopté"));
    await publishPost(app, other.accessToken, budget("Budget de l'État adopté"));
    await request(app.getHttpServer())
      .post(`/users/${other.id}/block`)
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .expect(201);

    expect((await similarTo(source.id)).otherMediaCount).toBe(1);
    expect(await similarTo(source.id, reader.accessToken)).toEqual({
      otherMediaCount: 0,
      posts: [],
    });
  });

  it("answers 404 for an unknown post", async () => {
    await request(app.getHttpServer())
      .get("/posts/0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11/similar")
      .expect(404);
  });
});
