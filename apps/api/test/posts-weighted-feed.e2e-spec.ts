import type { INestApplication } from "@nestjs/common";
import { paginated, postSummaryPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

const feedPage = paginated(postSummaryPublicSchema);

describe("Weighted feed « À la une » (e2e, SPEC §4.2)", () => {
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

  async function editor(pseudo: string) {
    return signUp(app, prisma, pseudo, { role: "EDITOR", editorStatus: "INDEPENDENT" });
  }

  async function page(query: string) {
    const response = await request(app.getHttpServer()).get(`/posts?sort=WEIGHTED&${query}`);
    expect(response.status).toBe(200);
    return feedPage.parse(response.body);
  }

  /** Every page of a draw, following the cursors. */
  async function allPages(seed: string, limit: number) {
    const items: { id: string; editorId: string }[] = [];
    let cursor: string | null = null;
    do {
      const current = await page(
        cursor ? `limit=${limit}&cursor=${cursor}` : `limit=${limit}&seed=${seed}`,
      );
      items.push(...current.items.map((post) => ({ id: post.id, editorId: post.editor.id })));
      cursor = current.nextCursor;
    } while (cursor);
    return items;
  }

  it("keeps the same draw for the same seed, page after page, without gaps nor duplicates", async () => {
    const editors = await Promise.all(["alpha", "bravo", "charlie"].map(editor));
    const ids: string[] = [];
    for (const [index, author] of editors.entries()) {
      for (let count = 0; count < 2; count++) {
        ids.push(
          (await publishPost(app, author.accessToken, { ...ARTICLE, title: `P${index}${count}` }))
            .id,
        );
      }
    }

    const first = await allPages("lecteur-1", 4);
    expect(first).toHaveLength(ids.length);
    expect(new Set(first.map((post) => post.id))).toEqual(new Set(ids));
    expect((await allPages("lecteur-1", 4)).map((post) => post.id)).toEqual(
      first.map((post) => post.id),
    );
  });

  it("never shows an editor twice in four consecutive posts when others can fill in", async () => {
    const prolific = await editor("prolifique");
    const others = await Promise.all(["b", "c", "d"].map((name) => editor(`media-${name}`)));
    for (let count = 0; count < 2; count++) {
      await publishPost(app, prolific.accessToken, { ...ARTICLE, title: `Prolifique ${count}` });
    }
    for (const other of others) {
      await publishPost(app, other.accessToken);
    }

    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const order = (await allPages(seed, 50)).map((post) => post.editorId);
      for (let start = 0; start + 4 <= order.length; start++) {
        const window = order.slice(start, start + 4);
        expect(new Set(window).size).toBe(window.length);
      }
    }
  });

  it("applies the filters of the feed", async () => {
    const author = await editor("alpha");
    await publishPost(app, author.accessToken, { ...ARTICLE, title: "France" });
    await publishPost(app, author.accessToken, { ...ARTICLE, title: "Europe", zone: "EUROPE" });
    const result = await page("seed=x&zone=EUROPE");
    expect(result.items.map((post) => post.title)).toEqual(["Europe"]);
  });

  it("ignores the posts published after the first page", async () => {
    const author = await editor("alpha");
    await publishPost(app, author.accessToken, { ...ARTICLE, title: "Avant 1" });
    await publishPost(app, author.accessToken, { ...ARTICLE, title: "Avant 2" });
    const first = await page("seed=x&limit=1");
    await publishPost(app, author.accessToken, { ...ARTICLE, title: "Après" });
    const second = await page(`limit=5&cursor=${first.nextCursor}`);
    expect(second.items.map((post) => post.title)).not.toContain("Après");
    expect(second.nextCursor).toBeNull();
  });

  it("refuses a damaged cursor", async () => {
    await request(app.getHttpServer()).get("/posts?sort=WEIGHTED&cursor=abc").expect(400);
  });
});
