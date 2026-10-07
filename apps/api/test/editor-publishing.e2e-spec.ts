import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant } from "./support/editor-applications.js";
import { GuardTestController } from "./support/guard-test.controller.js";
import { signUp } from "./support/users.js";

// ROADMAP phase 3 criterion: a PENDING editor cannot publish; INDEPENDENT and CERTIFIED can.
// The real post route arrives in phase 4: a test-only route requires post.create.
describe("Who may publish after the editor flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp([GuardTestController]));
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const publish = (token: string) =>
    request(app.getHttpServer())
      .post("/guard-test/publish")
      .set("Authorization", `Bearer ${token}`);

  async function decide(applicantId: string, role: "MODERATOR" | "ADMIN", status: string) {
    const deciderAccount = await signUp(
      app,
      prisma,
      `${role.toLowerCase()}-${applicantId.slice(0, 8)}`,
      {
        role,
      },
    );
    await request(app.getHttpServer())
      .post(`/moderation/editor-applications/${applicantId}/decision`)
      .set("Authorization", `Bearer ${deciderAccount.accessToken}`)
      .send({ status })
      .expect(201);
  }

  it("a PENDING applicant cannot publish", async () => {
    const applicant = await createApplicant(app, prisma, "attente");
    await publish(applicant.accessToken).expect(403);
  });

  it("an INDEPENDENT editor can publish, with the same token as before validation", async () => {
    const applicant = await createApplicant(app, prisma, "clara");
    await decide(applicant.id, "MODERATOR", "INDEPENDENT");
    await publish(applicant.accessToken).expect(201);
  });

  it("a CERTIFIED editor can publish", async () => {
    const applicant = await createApplicant(app, prisma, "lemonde");
    await decide(applicant.id, "ADMIN", "CERTIFIED");
    await publish(applicant.accessToken).expect(201);
  });
});
