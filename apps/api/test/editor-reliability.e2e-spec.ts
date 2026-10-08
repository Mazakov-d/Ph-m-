import type { INestApplication } from "@nestjs/common";
import { editorPublicSchema, postPublicSchema, type Verdict } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Reliability gauge of an editor (e2e, SPEC §5.7)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: { id: string; accessToken: string };
  let moderatorId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    editor = await signUp(app, prisma, "clara", { role: "EDITOR", editorStatus: "INDEPENDENT" });
    ({ id: moderatorId } = await signUp(app, prisma, "modo", { role: "MODERATOR" }));
  });

  afterAll(async () => {
    await app.close();
  });

  async function reviewedPost(...verdicts: Verdict[]): Promise<string> {
    const post = await publishPost(app, editor.accessToken);
    for (const [index, verdict] of verdicts.entries()) {
      await prisma.review.create({
        data: {
          postId: post.id,
          moderatorId,
          verdict,
          publicNote: "Note",
          sources: [],
          createdAt: new Date(Date.now() - (verdicts.length - index) * 1000),
        },
      });
    }
    return post.id;
  }

  async function profileLevel() {
    const response = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    return editorPublicSchema.parse(response.body).reliability;
  }

  it("has not enough history with fewer than 3 verdicts", async () => {
    await reviewedPost("ACCURATE");
    await reviewedPost("ACCURATE");
    expect(await profileLevel()).toBe("INSUFFICIENT_HISTORY");
  });

  it("rises with accurate verdicts and shows on the post page, never as a score", async () => {
    for (let count = 0; count < 4; count++) await reviewedPost("ACCURATE");
    expect(await profileLevel()).toBe("RELIABLE");
    // Verdicts a few seconds old weigh slightly less than 1 (SPEC §5.7): 60 is crossed at six.
    await reviewedPost("ACCURATE");
    const postId = await reviewedPost("ACCURATE");
    expect(await profileLevel()).toBe("VERY_RELIABLE");

    const response = await request(app.getHttpServer()).get(`/posts/${postId}`).expect(200);
    expect(postPublicSchema.parse(response.body).editorReliability).toBe("VERY_RELIABLE");
    expect(JSON.stringify(response.body)).not.toMatch(/score/i);
  });

  it("counts an article once, with its latest verdict (after appeal)", async () => {
    await reviewedPost("FALSE", "ACCURATE");
    await reviewedPost("UNVERIFIABLE");
    await reviewedPost("UNVERIFIABLE");
    // 50 + 2 (the FALSE verdict was replaced on appeal).
    expect(await profileLevel()).toBe("RELIABLE");
  });

  it("halves a penalty when the editor had corrected the article before the verdict", async () => {
    const corrected = await publishPost(app, editor.accessToken);
    await prisma.postCorrection.create({
      data: {
        postId: corrected.id,
        content: "Correction",
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.review.create({
      data: { postId: corrected.id, moderatorId, verdict: "FALSE", publicNote: "", sources: [] },
    });
    await reviewedPost("UNVERIFIABLE");
    await reviewedPost("UNVERIFIABLE");
    // 50 − 10 / 2 = 45: reliable; without the correction it would be 40 (vigilance).
    expect(await profileLevel()).toBe("RELIABLE");
  });
});
