import type { INestApplication } from "@nestjs/common";
import { paginated, postPublicSchema, postSummaryPublicSchema } from "@fama/shared";
import sharp from "sharp";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost, sendPost, smallPng } from "./support/posts.js";
import { signUp } from "./support/users.js";

const HOUR = 60 * 60 * 1000;
const SESSION_A = "1b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const SESSION_B = "2b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";

function binary(call: request.Test) {
  return call.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => done(null, Buffer.concat(chunks)));
  });
}

describe("Post detail, views and images (e2e, SPEC §3 and §4.1)", () => {
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

  const view = (postId: string, options: { token?: string; session?: string } = {}) => {
    const call = request(app.getHttpServer()).get(`/posts/${postId}`);
    if (options.token) call.set("Authorization", `Bearer ${options.token}`);
    if (options.session) call.set("x-fama-session", options.session);
    return call.expect(200);
  };
  const viewCountOf = async (postId: string) =>
    (await prisma.post.findUniqueOrThrow({ where: { id: postId } })).viewCount;

  describe("detail", () => {
    it("is readable without an account, with body and sources", async () => {
      const post = await publishPost(app, editor.accessToken);
      const response = await view(post.id);
      expect(postPublicSchema.parse(response.body)).toMatchObject({
        title: ARTICLE.title,
        body: ARTICLE.body,
        sources: ARTICLE.sources,
      });
    });

    it("stays reachable by direct link after 49 hours (ROADMAP phase 4)", async () => {
      const post = await publishPost(app, editor.accessToken);
      await prisma.post.update({
        where: { id: post.id },
        data: { createdAt: new Date(Date.now() - 49 * HOUR) },
      });
      await view(post.id);
      const feed = await request(app.getHttpServer()).get("/posts").expect(200);
      expect(feed.body.items).toHaveLength(0);
    });

    it("answers 404 for an unknown post", async () => {
      await request(app.getHttpServer())
        .get("/posts/0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11")
        .expect(404);
    });
  });

  describe("unique views (SPEC §3)", () => {
    it("counts an account once", async () => {
      const post = await publishPost(app, editor.accessToken);
      const reader = await signUp(app, prisma, "lecteur");
      await view(post.id, { token: reader.accessToken });
      await view(post.id, { token: reader.accessToken });
      expect(await viewCountOf(post.id)).toBe(1);
    });

    it("counts each account", async () => {
      const post = await publishPost(app, editor.accessToken);
      for (const pseudo of ["lea", "hugo"]) {
        const reader = await signUp(app, prisma, pseudo);
        await view(post.id, { token: reader.accessToken });
      }
      expect(await viewCountOf(post.id)).toBe(2);
    });

    it("counts an anonymous session once, and each session", async () => {
      const post = await publishPost(app, editor.accessToken);
      await view(post.id, { session: SESSION_A });
      await view(post.id, { session: SESSION_A });
      await view(post.id, { session: SESSION_B });
      expect(await viewCountOf(post.id)).toBe(2);
    });

    it("does not count a visitor without session, nor a malformed session", async () => {
      const post = await publishPost(app, editor.accessToken);
      await view(post.id);
      await view(post.id, { session: "not-a-uuid" });
      expect(await viewCountOf(post.id)).toBe(0);
    });

    it("does not count the author", async () => {
      const post = await publishPost(app, editor.accessToken);
      await view(post.id, { token: editor.accessToken });
      expect(await viewCountOf(post.id)).toBe(0);
    });

    it("never exposes the view count", async () => {
      const post = await publishPost(app, editor.accessToken);
      const response = await view(post.id, { session: SESSION_A });
      expect(response.body).not.toHaveProperty("viewCount");
    });
  });

  describe("images (docs/DECISIONS.md)", () => {
    it("serves an image publicly, cacheable for good", async () => {
      const created = await sendPost(app, editor.accessToken, ARTICLE, [await smallPng()]).expect(
        201,
      );
      const post = postPublicSchema.parse(created.body);
      const path = post.images[0]?.path ?? "";

      const response = await binary(request(app.getHttpServer()).get(path)).expect(200);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["cache-control"]).toContain("immutable");
      const metadata = await sharp(
        Buffer.isBuffer(response.body) ? response.body : Buffer.alloc(0),
      ).metadata();
      expect(metadata.format).toBe("png");
    });

    it("answers 404 for an image of another post", async () => {
      const created = await sendPost(app, editor.accessToken, ARTICLE, [await smallPng()]).expect(
        201,
      );
      const imageId = postPublicSchema.parse(created.body).images[0]?.id ?? "";
      const other = await publishPost(app, editor.accessToken);
      await request(app.getHttpServer()).get(`/posts/${other.id}/images/${imageId}`).expect(404);
    });
  });

  describe("publications of an editor (SPEC §2.2)", () => {
    it("lists all their posts, newest first, older than 48 hours included", async () => {
      const old = await publishPost(app, editor.accessToken, { ...ARTICLE, title: "Ancien" });
      await prisma.post.update({
        where: { id: old.id },
        data: { createdAt: new Date(Date.now() - 200 * HOUR) },
      });
      await publishPost(app, editor.accessToken, { ...ARTICLE, title: "Récent" });
      const other = await signUp(app, prisma, "autre", {
        role: "EDITOR",
        editorStatus: "CERTIFIED",
      });
      await publishPost(app, other.accessToken, { ...ARTICLE, title: "D'un autre" });

      const response = await request(app.getHttpServer())
        .get(`/editors/${editor.id}/posts`)
        .expect(200);
      const page = paginated(postSummaryPublicSchema).parse(response.body);
      expect(page.items.map((post) => post.title)).toEqual(["Récent", "Ancien"]);
    });
  });
});
