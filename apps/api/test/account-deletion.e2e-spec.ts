import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { RetentionPurgeJob } from "../src/retention/retention-purge.job.js";
import { StorageService } from "../src/storage/storage.service.js";
import { writeComment } from "./support/comments.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant } from "./support/editor-applications.js";
import { publishPost } from "./support/posts.js";
import { signUp, TEST_PASSWORD } from "./support/users.js";

const DAY = 24 * 60 * 60 * 1000;

describe("Account deletion and retention (e2e, SPEC §10)", () => {
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

  const server = () => request(app.getHttpServer());
  const deleteAccount = (token: string, password = TEST_PASSWORD) =>
    server().delete("/users/me").set("Authorization", `Bearer ${token}`).send({ password });

  it("deleted: cannot sign in, and appears as « Compte supprimé » (ROADMAP phase 11)", async () => {
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    const post = await publishPost(app, editor.accessToken);
    const reader = await signUp(app, prisma, "lea");
    await writeComment(app, reader.accessToken, post.id, "Mon avis");

    await deleteAccount(reader.accessToken).expect(204);

    await server()
      .post("/auth/login")
      .send({ email: "lea@test.fr", password: TEST_PASSWORD })
      .expect(401);
    await server().get("/auth/me").set("Authorization", `Bearer ${reader.accessToken}`).expect(401);
    const comments = await server().get(`/posts/${post.id}/comments`).expect(200);
    expect(comments.body.items[0]).toMatchObject({
      authorPseudo: "Compte supprimé",
      content: "Mon avis",
    });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: reader.id } });
    expect(stored.email).not.toContain("lea");
    expect(await prisma.refreshToken.count({ where: { userId: reader.id, revokedAt: null } })).toBe(
      0,
    );
  });

  it("requires the password", async () => {
    const reader = await signUp(app, prisma, "lea");
    await deleteAccount(reader.accessToken, "mauvais-mot-de-passe").expect(401);
    await server().get("/auth/me").set("Authorization", `Bearer ${reader.accessToken}`).expect(200);
  });

  it("lets several deleted accounts share the name and frees their pseudo", async () => {
    for (const pseudo of ["lea", "hugo"]) {
      const account = await signUp(app, prisma, pseudo);
      await deleteAccount(account.accessToken).expect(204);
    }
    expect(await prisma.user.count({ where: { pseudo: "Compte supprimé" } })).toBe(2);
    await server()
      .post("/auth/register")
      .send({ email: "nouvelle@test.fr", password: TEST_PASSWORD, pseudo: "lea" })
      .expect(201);
  });

  it("reserves « Compte supprimé » at sign-up", async () => {
    await server()
      .post("/auth/register")
      .send({ email: "x@test.fr", password: TEST_PASSWORD, pseudo: "Compte supprimé" })
      .expect(400);
  });

  it("removes the public profile of a deleted editor and lets a banned account delete itself", async () => {
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
      bannedAt: new Date(),
    });
    await deleteAccount(editor.accessToken).expect(204);
    await server().get(`/editors/${editor.id}`).expect(404);
  });

  it("purges after RETENTION_DAYS: comment texts and deleted editors' identities", async () => {
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    const post = await publishPost(app, editor.accessToken);
    const reader = await signUp(app, prisma, "lea");
    const old = await writeComment(app, reader.accessToken, post.id, "Ancien supprimé");
    const recent = await writeComment(app, reader.accessToken, post.id, "Récent supprimé");
    await prisma.comment.update({
      where: { id: old.id },
      data: { status: "DELETED", deletedAt: new Date(Date.now() - 366 * DAY) },
    });
    await prisma.comment.update({
      where: { id: recent.id },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    const applicant = await createApplicant(app, prisma, "ancien-editeur");
    // A validated editor keeps the profile of its posts until the purge.
    await prisma.editorProfile.update({
      where: { userId: applicant.id },
      data: { status: "INDEPENDENT" },
    });
    const identity = await prisma.editorIdentity.findUniqueOrThrow({
      where: { userId: applicant.id },
    });
    await deleteAccount(applicant.accessToken).expect(204);
    await prisma.user.update({
      where: { id: applicant.id },
      data: { deletedAt: new Date(Date.now() - 366 * DAY) },
    });

    expect(await app.get(RetentionPurgeJob).run()).toEqual({ comments: 1, identities: 1 });
    expect((await prisma.comment.findUniqueOrThrow({ where: { id: old.id } })).content).toBe("");
    expect((await prisma.comment.findUniqueOrThrow({ where: { id: recent.id } })).content).toBe(
      "Récent supprimé",
    );
    expect(await prisma.editorIdentity.count()).toBe(0);
    await expect(app.get(StorageService).get(identity.documentKeys[0] ?? "")).rejects.toThrow();
  });

  it("removes at once an editor application that was never validated (docs/DECISIONS.md)", async () => {
    const applicant = await createApplicant(app, prisma, "candidat");
    const identity = await prisma.editorIdentity.findUniqueOrThrow({
      where: { userId: applicant.id },
    });
    await deleteAccount(applicant.accessToken).expect(204);

    expect(await prisma.editorProfile.count({ where: { userId: applicant.id } })).toBe(0);
    expect(await prisma.editorIdentity.count({ where: { userId: applicant.id } })).toBe(0);
    await expect(app.get(StorageService).get(identity.documentKeys[0] ?? "")).rejects.toThrow();
    const moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    const queue = await server()
      .get("/moderation/editor-applications")
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .expect(200);
    expect(queue.body.items).toEqual([]);
  });
});
