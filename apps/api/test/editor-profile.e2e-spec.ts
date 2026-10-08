import type { INestApplication } from "@nestjs/common";
import { editorPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant, JOURNALIST_PROOFS } from "./support/editor-applications.js";
import { signUp } from "./support/users.js";

describe("Public editor profile (e2e, SPEC §2.2)", () => {
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

  async function validatedEditor(pseudo: string, showIdentityPublicly: boolean) {
    const editor = await createApplicant(app, prisma, pseudo, { showIdentityPublicly });
    const moderator = await signUp(app, prisma, `modo-${pseudo}`, { role: "MODERATOR" });
    await request(app.getHttpServer())
      .post(`/moderation/editor-applications/${editor.id}/decision`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ status: "INDEPENDENT", checkedProofs: JOURNALIST_PROOFS })
      .expect(201);
    return editor;
  }

  it("is readable without an account", async () => {
    const editor = await validatedEditor("clara", false);
    const response = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    expect(editorPublicSchema.parse(response.body)).toMatchObject({
      pseudo: "clara",
      editorStatus: "INDEPENDENT",
      editorialLine: "Ligne éditoriale de clara",
      ownerName: "Société clara",
    });
  });

  it("never contains any identity field when the editor hides it (ROADMAP phase 3)", async () => {
    const editor = await validatedEditor("clara", false);
    const response = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);

    expect(response.body).not.toHaveProperty("legalIdentity");
    const json = JSON.stringify(response.body);
    expect(json).not.toContain("Camille");
    expect(json).not.toContain("Durand");
    expect(json).not.toMatch(/legal|identity|firstName|lastName/i);
  });

  it("shows the identity when the editor chose to", async () => {
    const editor = await validatedEditor("clara", true);
    const response = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    expect(response.body).toMatchObject({
      legalIdentity: { firstName: "Camille", lastName: "Durand-clara" },
    });
  });

  it("follows the visibility setting changed later", async () => {
    const editor = await validatedEditor("clara", true);
    await request(app.getHttpServer())
      .patch("/editors/me")
      .set("Authorization", `Bearer ${editor.accessToken}`)
      .send({ showIdentityPublicly: false })
      .expect(200);
    const response = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    expect(response.body).not.toHaveProperty("legalIdentity");
  });

  it("does not exist for a pending applicant", async () => {
    const applicant = await createApplicant(app, prisma, "attente");
    await request(app.getHttpServer()).get(`/editors/${applicant.id}`).expect(404);
  });

  it("answers 400 for a malformed id", async () => {
    await request(app.getHttpServer()).get("/editors/not-a-uuid").expect(400);
  });
});
