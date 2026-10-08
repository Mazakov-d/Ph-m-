import type { INestApplication } from "@nestjs/common";
import { postPublicSchema } from "@fama/shared";
import sharp from "sharp";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { StorageService } from "../src/storage/storage.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant } from "./support/editor-applications.js";
import { ARTICLE, jpegWithMetadata, sendPost, smallPng } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Publishing a post (e2e, SPEC §3)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: StorageService;
  let editorToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ({ accessToken: editorToken } = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("fields", () => {
    it("publishes an article with its sources in order", async () => {
      const response = await sendPost(app, editorToken).expect(201);
      const post = postPublicSchema.parse(response.body);
      expect(post).toMatchObject({
        kind: "ARTICLE",
        title: "Le budget adopté",
        sources: ARTICLE.sources,
        editor: { pseudo: "clara", editorStatus: "INDEPENDENT" },
        reviewStatus: "NOT_REVIEWED",
        reportCount: 0,
        commentCount: 0,
        commentsEnabled: true,
        votes: null,
        images: [],
      });
    });

    it("lets the editor disable comments on an article", async () => {
      const response = await sendPost(app, editorToken, { ...ARTICLE, commentsEnabled: false });
      expect(response.body).toMatchObject({ commentsEnabled: false });
    });

    it("always enables comments on an opinion", async () => {
      const response = await sendPost(app, editorToken, {
        ...ARTICLE,
        kind: "OPINION",
        commentsEnabled: false,
      }).expect(201);
      expect(response.body).toMatchObject({ kind: "OPINION", commentsEnabled: true });
      // SPEC §7: an opinion never shows totals before voting.
      expect(response.body).toMatchObject({ votes: { results: null } });
    });

    it.each(["title", "summary", "body", "sources", "zone", "theme", "kind"])(
      "refuses a post without %s",
      async (field) => {
        const post = Object.fromEntries(Object.entries(ARTICLE).filter(([key]) => key !== field));
        const response = await sendPost(app, editorToken, post).expect(400);
        expect(response.body).toMatchObject({
          code: "VALIDATION_ERROR",
          issues: [{ path: [field] }],
        });
      },
    );

    it("requires at least one source for an article", async () => {
      await sendPost(app, editorToken, { ...ARTICLE, sources: [] }).expect(400);
    });

    it("publishes an opinion without source (SPEC §3)", async () => {
      const response = await sendPost(app, editorToken, {
        ...ARTICLE,
        kind: "OPINION",
        sources: [],
      });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ sources: [] });
    });

    it("requires a region for a LOCAL post", async () => {
      await sendPost(app, editorToken, { ...ARTICLE, zone: "LOCAL" }).expect(400);
      await sendPost(app, editorToken, { ...ARTICLE, zone: "LOCAL", region: "Bretagne" }).expect(
        201,
      );
    });
  });

  describe("layout and typefaces (docs/DECISIONS.md, interface brief)", () => {
    it("gives the default order and typefaces when the editor keeps them", async () => {
      const response = await sendPost(app, editorToken).expect(201);
      expect(postPublicSchema.parse(response.body)).toMatchObject({
        layout: "TEXT_FIRST",
        typefaces: { title: "SERIF", summary: "SANS", body: "SERIF" },
      });
    });

    it("keeps the editor's order, typefaces and bold or italic words", async () => {
      const response = await sendPost(app, editorToken, {
        ...ARTICLE,
        title: "Le budget **adopté**",
        body: "Un vote *serré* hier.",
        layout: "MEDIA_FIRST",
        typefaces: { title: "MONO", summary: "SERIF", body: "SANS" },
      }).expect(201);
      expect(postPublicSchema.parse(response.body)).toMatchObject({
        title: "Le budget **adopté**",
        body: "Un vote *serré* hier.",
        layout: "MEDIA_FIRST",
        typefaces: { title: "MONO", summary: "SERIF", body: "SANS" },
      });
    });

    it("refuses an unknown typeface", async () => {
      await sendPost(app, editorToken, {
        ...ARTICLE,
        typefaces: { title: "COMIC", summary: "SANS", body: "SANS" },
      }).expect(400);
    });

    it("accepts the « Autre » theme", async () => {
      const response = await sendPost(app, editorToken, { ...ARTICLE, theme: "OTHER" });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ theme: "OTHER" });
    });
  });

  describe("answer choices of an opinion (SPEC §7)", () => {
    const OPINION = { ...ARTICLE, kind: "OPINION" };

    it("gives the default choices when the editor sets none", async () => {
      const response = await sendPost(app, editorToken, OPINION).expect(201);
      const post = postPublicSchema.parse(response.body);
      expect(post.votes?.options.map((option) => option.label)).toEqual([
        "D'accord",
        "Pas d'accord",
      ]);
    });

    it("keeps the editor's choices, in order", async () => {
      const choices = ["Oui, sans attendre", "Non", "Seulement pour la recherche", "Sans avis"];
      const response = await sendPost(app, editorToken, {
        ...OPINION,
        voteOptions: choices,
      }).expect(201);
      const post = postPublicSchema.parse(response.body);
      expect(post.votes?.options.map((option) => option.label)).toEqual(choices);
      expect(post.votes).toMatchObject({ myOptionId: null, results: null });
    });

    it("refuses a single choice, five choices, or twice the same choice", async () => {
      await sendPost(app, editorToken, { ...OPINION, voteOptions: ["Oui"] }).expect(400);
      await sendPost(app, editorToken, {
        ...OPINION,
        voteOptions: ["A", "B", "C", "D", "E"],
      }).expect(400);
      await sendPost(app, editorToken, { ...OPINION, voteOptions: ["Oui", "OUI"] }).expect(400);
    });

    it("refuses choices on an article", async () => {
      const response = await sendPost(app, editorToken, {
        ...ARTICLE,
        voteOptions: ["Oui", "Non"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ issues: [{ path: ["voteOptions"] }] });
    });
  });

  describe("who may publish", () => {
    it("refuses a reader", async () => {
      const reader = await signUp(app, prisma, "lecteur");
      await sendPost(app, reader.accessToken).expect(403);
    });

    it("refuses a pending applicant", async () => {
      const applicant = await createApplicant(app, prisma, "attente");
      await sendPost(app, applicant.accessToken).expect(403);
    });
  });

  describe("images (docs/DECISIONS.md)", () => {
    it("attaches the images in order, the first one being the cover", async () => {
      const response = await sendPost(app, editorToken, ARTICLE, [
        await jpegWithMetadata(),
        await smallPng(),
      ]).expect(201);
      const post = postPublicSchema.parse(response.body);
      expect(post.images).toHaveLength(2);
      expect(post.coverImage).toEqual(post.images[0]);
      expect(post.images[0]?.path).toBe(`/posts/${post.id}/images/${post.images[0]?.id}`);
    });

    it("removes every metadata and reduces wide images", async () => {
      const response = await sendPost(app, editorToken, ARTICLE, [await jpegWithMetadata()]);
      const post = postPublicSchema.parse(response.body);
      const image = await prisma.postImage.findFirstOrThrow({ where: { postId: post.id } });
      const stored = await storage.get(image.storageKey);
      const metadata = await sharp(stored.bytes).metadata();

      expect(stored.contentType).toBe("image/jpeg");
      expect(metadata.exif).toBeUndefined();
      expect(metadata.width).toBe(2000);
    });

    it("refuses a fifth image", async () => {
      const png = await smallPng();
      await sendPost(app, editorToken, ARTICLE, [png, png, png, png, png]).expect(400);
    });

    it("refuses a file that is not an image", async () => {
      const response = await sendPost(app, editorToken, ARTICLE, [
        Buffer.from("%PDF-1.4 not an image"),
      ]).expect(400);
      expect(response.body).toMatchObject({ code: "INVALID_IMAGE" });
    });

    it("refuses a damaged image and keeps nothing", async () => {
      const damaged = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
      const response = await sendPost(app, editorToken, ARTICLE, [damaged]).expect(400);
      expect(response.body).toMatchObject({ code: "INVALID_IMAGE" });
      expect(await prisma.post.count()).toBe(0);
    });

    it("refuses an image over 5 MB", async () => {
      const tooBig = Buffer.concat([await smallPng(), Buffer.alloc(5 * 1024 * 1024)]);
      const response = await sendPost(app, editorToken, ARTICLE, [tooBig]).expect(413);
      expect(response.body).toMatchObject({ code: "FILE_TOO_LARGE" });
    });
  });
});
