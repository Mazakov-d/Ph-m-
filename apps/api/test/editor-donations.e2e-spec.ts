import type { INestApplication } from "@nestjs/common";
import { editorPublicSchema, postPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant } from "./support/editor-applications.js";
import { publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

describe("Donation link of an editor (e2e, docs/DECISIONS.md)", () => {
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

  /** A real editor: application with identity documents, validated by a moderator. */
  async function validatedEditor(pseudo: string) {
    const editor = await createApplicant(app, prisma, pseudo);
    const moderator = await signUp(app, prisma, `modo-${pseudo}`, { role: "MODERATOR" });
    await request(app.getHttpServer())
      .post(`/moderation/editor-applications/${editor.id}/decision`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ status: "INDEPENDENT" })
      .expect(201);
    return editor;
  }

  const setLink = (token: string, donationUrl: string | null) =>
    request(app.getHttpServer())
      .put("/editors/me/donation-link")
      .set("Authorization", `Bearer ${token}`)
      .send({ donationUrl });

  it("shows the validated editor's link on the profile and under each post", async () => {
    const editor = await validatedEditor("clara");
    const post = await publishPost(app, editor.accessToken);
    const saved = await setLink(editor.accessToken, "https://fr.tipeee.com/clara").expect(200);
    expect(saved.body).toMatchObject({ donationUrl: "https://fr.tipeee.com/clara" });

    const profile = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    expect(editorPublicSchema.parse(profile.body).donationUrl).toBe("https://fr.tipeee.com/clara");
    const shown = await request(app.getHttpServer()).get(`/posts/${post.id}`).expect(200);
    expect(postPublicSchema.parse(shown.body).editorDonationUrl).toBe(
      "https://fr.tipeee.com/clara",
    );

    await setLink(editor.accessToken, null).expect(200);
    const removed = await request(app.getHttpServer()).get(`/editors/${editor.id}`).expect(200);
    expect(removed.body.donationUrl).toBeNull();
  });

  it("refuses an insecure link, and a reader", async () => {
    const editor = await validatedEditor("clara");
    await setLink(editor.accessToken, "http://fr.tipeee.com/clara").expect(400);
    const reader = await signUp(app, prisma, "lecteur");
    await setLink(reader.accessToken, "https://fr.tipeee.com/lecteur").expect(403);
  });
});
