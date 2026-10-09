import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { sendComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { signUp, TEST_PASSWORD } from "./support/users.js";

// docs/DECISIONS.md: rate limits (turned off in the other test files).
describe("Rate limits (e2e, ROADMAP phase 11)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.RATE_LIMITS_ENABLED = "false";
    ({ app, prisma } = await createTestApp());
    await truncateAllTables(prisma);
  });

  afterEach(async () => {
    process.env.RATE_LIMITS_ENABLED = "false";
    await app.close();
  });

  const register = (n: number) =>
    request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: `compte${n}@test.fr`, password: TEST_PASSWORD, pseudo: `compte${n}` });

  it("refuses a 6th sign-up within an hour from the same address", async () => {
    process.env.RATE_LIMITS_ENABLED = "true";
    for (const n of [1, 2, 3, 4, 5]) {
      await register(n).expect(201);
    }
    const response = await register(6).expect(429);
    expect(response.body).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("refuses an 11th sign-in attempt within 15 minutes", async () => {
    await register(1).expect(201);
    process.env.RATE_LIMITS_ENABLED = "true";
    const attempt = () =>
      request(app.getHttpServer())
        .post("/auth/login")
        .send({ identifier: "compte1@test.fr", password: "mauvais" });
    for (let n = 0; n < 10; n++) {
      await attempt().expect(401);
    }
    await attempt().expect(429);
  });

  it("counts comments per account: 10 per minute", async () => {
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    const post = await publishPost(app, editor.accessToken);
    const lea = await signUp(app, prisma, "lea");
    const hugo = await signUp(app, prisma, "hugo");
    process.env.RATE_LIMITS_ENABLED = "true";
    for (let n = 0; n < 10; n++) {
      await sendComment(app, lea.accessToken, post.id, `Commentaire ${n}`).expect(201);
    }
    await sendComment(app, lea.accessToken, post.id, "Un de trop").expect(429);
    await sendComment(app, hugo.accessToken, post.id, "Un autre compte").expect(201);
  });
});
