import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Turning comments on or off (e2e, SPEC §3)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editorToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
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

  const toggle = (token: string, postId: string, commentsEnabled: boolean) =>
    request(app.getHttpServer())
      .patch(`/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ commentsEnabled });

  it("lets the editor turn comments off then on again on their article", async () => {
    const post = await publishPost(app, editorToken);
    const off = await toggle(editorToken, post.id, false).expect(200);
    expect(off.body).toMatchObject({ commentsEnabled: false });
    const on = await toggle(editorToken, post.id, true).expect(200);
    expect(on.body).toMatchObject({ commentsEnabled: true });
  });

  it("never turns comments off on an opinion", async () => {
    const opinion = await publishPost(app, editorToken, { ...ARTICLE, kind: "OPINION" });
    const response = await toggle(editorToken, opinion.id, false).expect(409);
    expect(response.body).toMatchObject({ code: "COMMENTS_REQUIRED_FOR_OPINION" });
    await toggle(editorToken, opinion.id, true).expect(200);
  });

  it("refuses another editor's article", async () => {
    const post = await publishPost(app, editorToken);
    const other = await signUp(app, prisma, "autre", { role: "EDITOR", editorStatus: "CERTIFIED" });
    await toggle(other.accessToken, post.id, false).expect(403);
    const unchanged = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(unchanged.commentsEnabled).toBe(true);
  });

  it("refuses a reader", async () => {
    const post = await publishPost(app, editorToken);
    const reader = await signUp(app, prisma, "lecteur");
    await toggle(reader.accessToken, post.id, false).expect(403);
  });

  it("answers 404 for an unknown post", async () => {
    await toggle(editorToken, "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", false).expect(404);
  });
});
