import type { INestApplication } from "@nestjs/common";
import { FEED_BODY_EXCERPT_LENGTH, paginated, postSummaryPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost, sendPost, smallPng } from "./support/posts.js";
import { signUp } from "./support/users.js";

const feedPage = paginated(postSummaryPublicSchema);
const HOUR = 60 * 60 * 1000;

describe("Public feed (e2e, SPEC §4)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: { id: string; accessToken: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    editor = await signUp(app, prisma, "clara", { role: "EDITOR", editorStatus: "INDEPENDENT" });
  });

  afterAll(async () => {
    await app.close();
  });

  /** Publishes a post through the API, then dates it `hoursAgo` hours in the past. */
  async function publishAged(
    title: string,
    hoursAgo: number,
    overrides: object = {},
    token = editor.accessToken,
  ) {
    const post = await publishPost(app, token, { ...ARTICLE, title, ...overrides });
    await prisma.post.update({
      where: { id: post.id },
      data: { createdAt: new Date(Date.now() - hoursAgo * HOUR) },
    });
    return post;
  }

  async function feedTitles(query = "", token?: string): Promise<string[]> {
    const call = request(app.getHttpServer()).get(`/posts${query}`);
    if (token) {
      call.set("Authorization", `Bearer ${token}`);
    }
    const response = await call.expect(200);
    return feedPage.parse(response.body).items.map((post) => post.title);
  }

  it("is readable without an account, newest first, as cards without body", async () => {
    await publishAged("Ancien", 10);
    await publishAged("Récent", 1);
    const response = await request(app.getHttpServer()).get("/posts").expect(200);
    const page = feedPage.parse(response.body);
    expect(page.items.map((post) => post.title)).toEqual(["Récent", "Ancien"]);
    expect(response.body.items[0]).not.toHaveProperty("body");
  });

  it("shows the start of the article, or nothing when the pictures come first (interface brief)", async () => {
    await publishPost(app, editor.accessToken, { ...ARTICLE, title: "Texte" });
    const longBody = `${"mot ".repeat(100)}fin`;
    await publishPost(app, editor.accessToken, { ...ARTICLE, title: "Long", body: longBody });
    await sendPost(app, editor.accessToken, { ...ARTICLE, title: "Photo", layout: "MEDIA_FIRST" }, [
      await smallPng(),
    ]).expect(201);
    const response = await request(app.getHttpServer()).get("/posts").expect(200);
    const cards = feedPage.parse(response.body).items;
    const byTitle = (title: string) => cards.find((card) => card.title === title);

    expect(byTitle("Texte")?.bodyExcerpt).toBe(ARTICLE.body);
    expect(byTitle("Long")?.bodyExcerpt).toMatch(/^mot .*…$/);
    expect(byTitle("Long")?.bodyExcerpt?.length).toBeLessThanOrEqual(FEED_BODY_EXCERPT_LENGTH + 1);
    expect(byTitle("Photo")?.bodyExcerpt).toBeNull();
  });

  it("keeps posts of the last 48 hours only (ROADMAP: 49 h is out)", async () => {
    await publishAged("47 heures", 47);
    await publishAged("49 heures", 49);
    expect(await feedTitles()).toEqual(["47 heures"]);
  });

  it("today keeps the sliding last 24 hours", async () => {
    await publishAged("23 heures", 23);
    await publishAged("25 heures", 25);
    expect(await feedTitles("?today=true")).toEqual(["23 heures"]);
  });

  it("combines today, zone and theme exactly (ROADMAP phase 4)", async () => {
    await publishAged("Match", 2, { zone: "EUROPE", theme: "TECH" });
    await publishAged("Mauvaise zone", 2, { zone: "FRANCE", theme: "TECH" });
    await publishAged("Mauvais thème", 2, { zone: "EUROPE", theme: "SPORT" });
    await publishAged("Trop ancien", 30, { zone: "EUROPE", theme: "TECH" });

    expect(await feedTitles("?today=true&zone=EUROPE&theme=TECH")).toEqual(["Match"]);
    expect((await feedTitles("?zone=EUROPE&theme=TECH")).sort()).toEqual(["Match", "Trop ancien"]);
    expect((await feedTitles("?theme=TECH")).sort()).toEqual([
      "Match",
      "Mauvaise zone",
      "Trop ancien",
    ]);
  });

  it("hides the authors the reader blocked, for that reader only (SPEC §10)", async () => {
    const other = await signUp(app, prisma, "autre", { role: "EDITOR", editorStatus: "CERTIFIED" });
    await publishAged("De Clara", 1);
    await publishAged("De Autre", 2, {}, other.accessToken);
    const reader = await signUp(app, prisma, "lecteur");
    await prisma.block.create({ data: { blockerId: reader.id, blockedId: other.id } });

    expect(await feedTitles("", reader.accessToken)).toEqual(["De Clara"]);
    expect(await feedTitles()).toEqual(["De Clara", "De Autre"]);
  });

  it("pages with a cursor without gaps nor duplicates", async () => {
    for (const hours of [1, 2, 3, 4, 5]) {
      await publishAged(`Post ${hours}`, hours);
    }
    const titles: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?limit=2&cursor=${cursor}` : "?limit=2";
      const response = await request(app.getHttpServer()).get(`/posts${query}`).expect(200);
      const page = feedPage.parse(response.body);
      titles.push(...page.items.map((post) => post.title));
      cursor = page.nextCursor;
    } while (cursor);
    expect(titles).toEqual(["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"]);
  });

  it("refuses an invalid token instead of answering anonymously", async () => {
    await request(app.getHttpServer())
      .get("/posts")
      .set("Authorization", "Bearer expired.or.forged")
      .expect(401);
  });

  it("rejects an unknown filter value", async () => {
    await request(app.getHttpServer()).get("/posts?zone=MARS").expect(400);
  });
});
