import type { INestApplication } from "@nestjs/common";
import { searchResultsPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

const HOUR = 60 * 60 * 1000;

describe("Search (e2e, SPEC §4.4)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let leMonde: { id: string; accessToken: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    leMonde = await signUp(app, prisma, "Le Monde", { role: "EDITOR", editorStatus: "CERTIFIED" });
  });

  afterAll(async () => {
    await app.close();
  });

  const search = async (query: string, token?: string) => {
    const call = request(app.getHttpServer()).get(`/search?${query}`);
    if (token) call.set("Authorization", `Bearer ${token}`);
    const response = await call.expect(200);
    return searchResultsPublicSchema.parse(response.body);
  };

  async function publishAged(title: string, hoursAgo: number, overrides: object = {}) {
    const post = await publishPost(app, leMonde.accessToken, { ...ARTICLE, title, ...overrides });
    await prisma.post.update({
      where: { id: post.id },
      data: { createdAt: new Date(Date.now() - hoursAgo * HOUR) },
    });
    return post;
  }

  it("« le mond » finds the editor « Le Monde » (ROADMAP phase 10)", async () => {
    const results = await search("q=le%20mond");
    expect(results.editors).toMatchObject([
      { id: leMonde.id, pseudo: "Le Monde", editorStatus: "CERTIFIED" },
    ]);
  });

  it("does not list pending applicants as editors", async () => {
    await signUp(app, prisma, "Le Mondial", { role: "READER", editorStatus: "PENDING" });
    const results = await search("q=mondial");
    expect(results.editors.map((editor) => editor.pseudo)).not.toContain("Le Mondial");
  });

  it("finds posts by words of the title, summary or body, whatever the accents and case", async () => {
    await publishAged("Le budget de l'État adopté", 1, {
      summary: "Vote à l'Assemblée.",
      body: "Les économies prévues…",
    });
    await publishAged("Un festival à Avignon", 2);
    expect((await search("q=ETAT")).posts.map((post) => post.title)).toEqual([
      "Le budget de l'État adopté",
    ]);
    expect((await search("q=economies")).posts).toHaveLength(1);
    expect((await search("q=assemblee")).posts).toHaveLength(1);
  });

  it("tolerates a typo in a title (pg_trgm)", async () => {
    await publishAged("Festival d'Avignon", 1);
    expect((await search("q=festivl%20avignon")).posts).toHaveLength(1);
  });

  it("combines the text and the filters exactly (ROADMAP phase 10)", async () => {
    await publishAged("Climat : le sommet européen", 2, { zone: "EUROPE", theme: "ENVIRONMENT" });
    await publishAged("Climat : la France en retard", 2, { zone: "FRANCE", theme: "ENVIRONMENT" });
    await publishAged("Climat : le sport s'adapte", 2, { zone: "EUROPE", theme: "SPORT" });
    await publishAged("Climat : sommet de l'an dernier", 30, {
      zone: "EUROPE",
      theme: "ENVIRONMENT",
    });
    await publishAged("Budget européen", 2, { zone: "EUROPE", theme: "ENVIRONMENT" });

    const filtered = await search("q=climat&today=true&zone=EUROPE&theme=ENVIRONMENT");
    expect(filtered.posts.map((post) => post.title)).toEqual(["Climat : le sommet européen"]);
    const zoneOnly = await search("q=climat&zone=EUROPE");
    expect(zoneOnly.posts.map((post) => post.title).sort()).toEqual([
      "Climat : le sommet européen",
      "Climat : le sport s'adapte",
      "Climat : sommet de l'an dernier",
    ]);
  });

  it("leaves out removed opinions and the authors the reader blocked", async () => {
    const opinion = await publishAged("Climat : une tribune", 1, { kind: "OPINION" });
    await prisma.post.update({ where: { id: opinion.id }, data: { removedAt: new Date() } });
    await publishAged("Climat : un article", 1);
    expect((await search("q=climat")).posts.map((post) => post.title)).toEqual([
      "Climat : un article",
    ]);

    const reader = await signUp(app, prisma, "lecteur");
    await prisma.block.create({ data: { blockerId: reader.id, blockedId: leMonde.id } });
    expect((await search("q=climat", reader.accessToken)).posts).toEqual([]);
  });

  it("requires at least 2 characters", async () => {
    await request(app.getHttpServer()).get("/search?q=a").expect(400);
  });
});
