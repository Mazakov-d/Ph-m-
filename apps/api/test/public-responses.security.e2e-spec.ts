import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant } from "./support/editor-applications.js";
import { publishPost } from "./support/posts.js";
import { signUp, TEST_PASSWORD } from "./support/users.js";

/**
 * ROADMAP phase 11 (security review): the anonymous routes never send back a private value
 * (e-mail, hidden legal identity, password, report weights, view counter).
 */
describe("Public responses carry no private data (e2e, ROADMAP phase 11)", () => {
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

  it("never exposes e-mails, hidden identities or internal counters", async () => {
    const editor = await createApplicant(app, prisma, "secretnews", {
      showIdentityPublicly: false,
    });
    const moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    await request(app.getHttpServer())
      .post(`/moderation/editor-applications/${editor.id}/decision`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ status: "INDEPENDENT" })
      .expect(201);
    const reader = await signUp(app, prisma, "lecteur");
    const post = await publishPost(app, editor.accessToken);
    await writeComment(app, reader.accessToken, post.id, "Un commentaire public");
    await request(app.getHttpServer())
      .post(`/posts/${post.id}/reports`)
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .send({ reason: "DUBIOUS_SOURCE", details: null })
      .expect(201);

    const routes = [
      "/posts",
      `/posts/${post.id}`,
      `/posts/${post.id}/comments`,
      `/editors/${editor.id}`,
      `/editors/${editor.id}/posts`,
      "/search?q=secretnews",
    ];
    const secrets = ["@test.fr", "Camille", "Durand", TEST_PASSWORD];
    const forbiddenKeys = /"(email|passwordHash|weight|totalReportWeight|reporterId|viewCount)"/;

    for (const route of routes) {
      const response = await request(app.getHttpServer()).get(route).expect(200);
      const json = JSON.stringify(response.body);
      for (const secret of secrets) {
        expect({ route, leaked: json.includes(secret) }).toEqual({ route, leaked: false });
      }
      expect({ route, keys: forbiddenKeys.exec(json)?.[0] ?? null }).toEqual({ route, keys: null });
    }
  });
});
