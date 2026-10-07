import type { INestApplication } from "@nestjs/common";
import { editorApplicationPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { StorageService } from "../src/storage/storage.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { signUp } from "./support/users.js";

const PDF = Buffer.from("%PDF-1.4\n% identity card scan\n");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const APPLICATION = {
  legalFirstName: "Clara",
  legalLastName: "Martin",
  editorialLine: "Enquêtes sur l'environnement.",
  ownerName: "Clara Martin",
  ownerGroup: null,
  showIdentityPublicly: false,
};

describe("Editor application (e2e, SPEC §2.2)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: StorageService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function apply(token: string, application: object = APPLICATION, files = [PDF]) {
    const call = request(app.getHttpServer())
      .post("/editors/application")
      .set("Authorization", `Bearer ${token}`)
      .field("application", JSON.stringify(application));
    files.forEach((file, index) => call.attach("documents", file, `document-${index}`));
    return call;
  }

  it("records a PENDING application, keeps the account READER, stores the documents privately", async () => {
    const { id, accessToken } = await signUp(app, prisma, "clara");
    const response = await apply(accessToken, APPLICATION, [PDF, PNG]).expect(201);

    expect(editorApplicationPublicSchema.parse(response.body)).toMatchObject({
      status: "PENDING",
      documentCount: 2,
      showIdentityPublicly: false,
    });
    // The legal identity is never sent back, not even to the applicant.
    expect(response.body).not.toHaveProperty("legalFirstName");
    expect(response.body).not.toHaveProperty("legalLastName");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: { editorIdentity: true },
    });
    expect(user.role).toBe("READER");
    const keys = user.editorIdentity?.documentKeys ?? [];
    expect(keys).toHaveLength(2);
    const stored = await storage.get(keys[0] ?? "");
    expect(Buffer.from(stored.bytes).equals(PDF)).toBe(true);
  });

  it("shows the application to its author", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    await apply(accessToken).expect(201);
    const response = await request(app.getHttpServer())
      .get("/editors/me/application")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body).toMatchObject({ status: "PENDING", documentCount: 1 });
  });

  it("refuses a second application while one is pending", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    await apply(accessToken).expect(201);
    const response = await apply(accessToken).expect(409);
    expect(response.body).toMatchObject({ code: "EDITOR_APPLICATION_EXISTS" });
  });

  it("lets a rejected applicant apply again and deletes the old documents", async () => {
    const { id, accessToken } = await signUp(app, prisma, "clara");
    await apply(accessToken).expect(201);
    const before = await prisma.editorIdentity.findUniqueOrThrow({ where: { userId: id } });
    await prisma.editorProfile.update({
      where: { userId: id },
      data: { status: "REJECTED", rejectionReason: "Pièce illisible" },
    });

    const response = await apply(accessToken, { ...APPLICATION, ownerName: "Clara M." }, [PNG]);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: "PENDING", rejectionReason: null });
    await expect(storage.get(before.documentKeys[0] ?? "")).rejects.toThrow();
  });

  it("requires at least one document", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    const response = await apply(accessToken, APPLICATION, []).expect(400);
    expect(response.body).toMatchObject({ code: "INVALID_DOCUMENT" });
  });

  it("refuses a file that is not really a PDF, JPEG or PNG", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    const response = await apply(accessToken, APPLICATION, [Buffer.from("not a pdf")]).expect(400);
    expect(response.body).toMatchObject({ code: "INVALID_DOCUMENT" });
    expect(await prisma.editorProfile.count()).toBe(0);
  });

  it("refuses more than 5 documents", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    await apply(accessToken, APPLICATION, [PDF, PDF, PDF, PDF, PDF, PDF]).expect(400);
  });

  it("refuses a document over 10 MB", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    const tooBig = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]);
    const response = await apply(accessToken, APPLICATION, [tooBig]).expect(413);
    expect(response.body).toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("validates the application fields", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    const response = await apply(accessToken, { ...APPLICATION, editorialLine: "" }).expect(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_ERROR",
      issues: [{ path: ["editorialLine"] }],
    });
  });

  it("refuses a moderator (an account has a single role)", async () => {
    const { accessToken } = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    await apply(accessToken).expect(403);
  });

  it("refuses a suspended account", async () => {
    const { accessToken } = await signUp(app, prisma, "suspendu", {
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    const response = await apply(accessToken).expect(403);
    expect(response.body).toMatchObject({ code: "ACCOUNT_RESTRICTED" });
  });

  it("lets the applicant change the identity visibility", async () => {
    const { accessToken } = await signUp(app, prisma, "clara");
    await apply(accessToken).expect(201);
    const response = await request(app.getHttpServer())
      .patch("/editors/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ showIdentityPublicly: true })
      .expect(200);
    expect(response.body).toMatchObject({ showIdentityPublicly: true });
  });
});
