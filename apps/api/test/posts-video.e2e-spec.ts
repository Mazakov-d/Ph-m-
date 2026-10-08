import type { INestApplication } from "@nestjs/common";
import { paginated, postPublicSchema, postSummaryPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, sendPost } from "./support/posts.js";
import { signUp } from "./support/users.js";
import { phoneVideo, videoTags } from "./support/videos.js";

/** Reads a whole binary answer (supertest keeps text by default). */
function binary(response: request.Response, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer) => chunks.push(chunk));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("Videos in posts (e2e, docs/DECISIONS.md)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let video: Buffer;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    video = await phoneVideo();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ({ accessToken: token } = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  it("publishes a video converted to MP4, without its place nor its comment", async () => {
    const response = await sendPost(app, token, ARTICLE, [], video).expect(201);
    const post = postPublicSchema.parse(response.body);
    expect(post.video).toEqual({
      path: `/posts/${post.id}/video`,
      posterPath: `/posts/${post.id}/video/poster`,
      durationSeconds: 2,
    });

    const served = await request(app.getHttpServer())
      .get(`/posts/${post.id}/video`)
      .buffer(true)
      .parse(binary)
      .expect(200);
    expect(served.headers["content-type"]).toBe("video/mp4");
    expect(served.headers["accept-ranges"]).toBe("bytes");
    const tags = await videoTags(served.body);
    expect(JSON.stringify(tags)).not.toMatch(/48\.8566|Clara/);
  });

  it("serves a part of the video when the player asks for one", async () => {
    const post = postPublicSchema.parse((await sendPost(app, token, ARTICLE, [], video)).body);
    const part = await request(app.getHttpServer())
      .get(`/posts/${post.id}/video`)
      .set("Range", "bytes=0-99")
      .buffer(true)
      .parse(binary)
      .expect(206);
    expect(part.headers["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
    expect(part.body).toHaveLength(100);
  });

  it("serves a still image of the video", async () => {
    const post = postPublicSchema.parse((await sendPost(app, token, ARTICLE, [], video)).body);
    const poster = await request(app.getHttpServer())
      .get(`/posts/${post.id}/video/poster`)
      .expect(200);
    expect(poster.headers["content-type"]).toBe("image/jpeg");
  });

  it("shows the video on a card whose media come first", async () => {
    await sendPost(app, token, { ...ARTICLE, layout: "MEDIA_FIRST" }, [], video).expect(201);
    const feed = paginated(postSummaryPublicSchema).parse(
      (await request(app.getHttpServer()).get("/posts").expect(200)).body,
    );
    expect(feed.items[0]?.bodyExcerpt).toBeNull();
    expect(feed.items[0]?.video?.durationSeconds).toBe(2);
  });

  it("refuses a video over 3 minutes and keeps nothing", async () => {
    const long = await phoneVideo(181);
    const response = await sendPost(app, token, ARTICLE, [], long);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VIDEO_TOO_LONG");
    expect(await prisma.post.count()).toBe(0);
  });

  it("refuses a file that is not a video", async () => {
    const fake = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from("ftypmp42"),
      Buffer.alloc(64),
    ]);
    for (const file of [Buffer.from("%PDF-1.4 pas une vidéo"), fake]) {
      const response = await sendPost(app, token, ARTICLE, [], file);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("INVALID_VIDEO");
    }
  });
});
