import type { INestApplication } from "@nestjs/common";
import { editorModerationSchema, paginated } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { createApplicant, JOURNALIST_PROOFS, TEST_PDF } from "./support/editor-applications.js";
import { signUp } from "./support/users.js";

const editorPage = paginated(editorModerationSchema);

describe("Moderation of editor applications (e2e, SPEC §2.2)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let moderator: { id: string; accessToken: string };
  let admin: { id: string; accessToken: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    admin = await signUp(app, prisma, "direction", { role: "ADMIN" });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const decide = (token: string, userId: string, decision: object) =>
    server()
      .post(`/moderation/editor-applications/${userId}/decision`)
      .set("Authorization", `Bearer ${token}`)
      // The proofs of a journalist are checked unless a test says otherwise.
      .send({ checkedProofs: JOURNALIST_PROOFS, ...decision });

  describe("list", () => {
    it("shows pending applications with the legal identity to a moderator", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const response = await server()
        .get("/moderation/editor-applications")
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(200);

      const page = editorPage.parse(response.body);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toMatchObject({
        userId: applicant.id,
        editorStatus: "PENDING",
        legalLastName: "Durand-clara",
        documentCount: 1,
      });
    });

    it("refuses a reader", async () => {
      const reader = await signUp(app, prisma, "lecteur");
      await server()
        .get("/moderation/editor-applications")
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .expect(403);
    });

    it("pages through the applications with a cursor, oldest first", async () => {
      await createApplicant(app, prisma, "premier");
      await createApplicant(app, prisma, "second");
      const first = await server()
        .get("/moderation/editor-applications?limit=1")
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(200);
      const firstPage = editorPage.parse(first.body);
      expect(firstPage.items[0]?.pseudo).toBe("premier");
      expect(firstPage.nextCursor).not.toBeNull();

      const second = await server()
        .get(`/moderation/editor-applications?limit=1&cursor=${firstPage.nextCursor}`)
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(200);
      const secondPage = editorPage.parse(second.body);
      expect(secondPage.items[0]?.pseudo).toBe("second");
      expect(secondPage.nextCursor).toBeNull();
    });
  });

  describe("decisions", () => {
    it("refuses a validation until every required proof is checked (docs/DECISIONS.md)", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const refused = await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
        checkedProofs: ["IDENTITY"],
      }).expect(400);
      expect(refused.body.code).toBe("PROOFS_MISSING");
      await decide(moderator.accessToken, applicant.id, { status: "INDEPENDENT" }).expect(201);
      const profile = await prisma.editorProfile.findUniqueOrThrow({
        where: { userId: applicant.id },
      });
      expect([...profile.verifiedProofs].sort()).toEqual(["IDENTITY", "PUBLISHED_WORKS"]);
    });

    it("shows the proofs of a media group to the moderator, with its verification code", async () => {
      const applicant = await signUp(app, prisma, "le-media");
      await server()
        .post("/editors/application")
        .set("Authorization", `Bearer ${applicant.accessToken}`)
        .field(
          "application",
          JSON.stringify({
            applicantType: "MEDIA_GROUP",
            legalFirstName: "Jeanne",
            legalLastName: "Martin",
            editorialLine: "Quotidien régional.",
            ownerName: "Le Média SA",
            ownerGroup: null,
            siret: "73282932000074",
            websiteUrl: "https://www.lemedia.fr",
            publicationDirector: "Jeanne Martin",
            professionalEmail: "jeanne@lemedia.fr",
          }),
        )
        .attach("documents", TEST_PDF, "kbis.pdf")
        .expect(201);
      const list = await server()
        .get("/moderation/editor-applications")
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(200);
      expect(list.body.items[0]).toMatchObject({
        applicantType: "MEDIA_GROUP",
        siret: "73282932000074",
        websiteUrl: "https://www.lemedia.fr",
        professionalEmail: "jeanne@lemedia.fr",
        verifiedProofs: [],
      });
      expect(list.body.items[0].verificationCode).toMatch(/^PHEME-[A-Z0-9]{6}$/);
      // The proofs of a journalist are not enough for a media group.
      const refused = await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
      }).expect(400);
      expect(refused.body.code).toBe("PROOFS_MISSING");
    });

    it("a moderator validates INDEPENDENT: the account becomes EDITOR and can publish", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const response = await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
      }).expect(201);
      expect(response.body).toMatchObject({ editorStatus: "INDEPENDENT" });

      const me = await server()
        .get("/auth/me")
        .set("Authorization", `Bearer ${applicant.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ role: "EDITOR", editorStatus: "INDEPENDENT" });
    });

    it("a moderator cannot validate CERTIFIED (ROADMAP phase 3)", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const response = await decide(moderator.accessToken, applicant.id, {
        status: "CERTIFIED",
      }).expect(403);
      expect(response.body).toMatchObject({ code: "FORBIDDEN" });

      const profile = await prisma.editorProfile.findUniqueOrThrow({
        where: { userId: applicant.id },
      });
      expect(profile.status).toBe("PENDING");
    });

    it("an admin certifies a pending applicant or an independent editor", async () => {
      const pending = await createApplicant(app, prisma, "attente");
      await decide(admin.accessToken, pending.id, {
        status: "CERTIFIED",
        checkedProofs: JOURNALIST_PROOFS,
      }).expect(201);

      const independent = await createApplicant(app, prisma, "independant");
      await decide(moderator.accessToken, independent.id, {
        status: "INDEPENDENT",
        checkedProofs: JOURNALIST_PROOFS,
      }).expect(201);
      const response = await decide(admin.accessToken, independent.id, {
        status: "CERTIFIED",
      }).expect(201);
      expect(response.body).toMatchObject({ editorStatus: "CERTIFIED" });
    });

    it("rejects with a mandatory reason; the account stays READER", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await decide(moderator.accessToken, applicant.id, { status: "REJECTED" }).expect(400);
      const response = await decide(moderator.accessToken, applicant.id, {
        status: "REJECTED",
        rejectionReason: "Pièce d'identité illisible",
      }).expect(201);
      expect(response.body).toMatchObject({
        editorStatus: "REJECTED",
        rejectionReason: "Pièce d'identité illisible",
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { id: applicant.id } });
      expect(user.role).toBe("READER");
    });

    it("refuses a decision that does not apply to the current status", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await decide(moderator.accessToken, applicant.id, {
        status: "REJECTED",
        rejectionReason: "Incomplet",
      }).expect(201);
      const response = await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
      }).expect(409);
      expect(response.body).toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    });

    it("lets only one of two simultaneous decisions succeed", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const otherModerator = await signUp(app, prisma, "modo2", { role: "MODERATOR" });
      const statuses = await Promise.all([
        decide(moderator.accessToken, applicant.id, {
          status: "INDEPENDENT",
          checkedProofs: JOURNALIST_PROOFS,
        }),
        decide(otherModerator.accessToken, applicant.id, {
          status: "REJECTED",
          rejectionReason: "Doublon",
        }),
      ]).then((responses) => responses.map((response) => response.status).sort());
      expect(statuses).toEqual([201, 409]);
    });

    it("writes every decision to the audit log (SPEC §2.4)", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
        checkedProofs: JOURNALIST_PROOFS,
      }).expect(201);
      const logs = await prisma.auditLog.findMany({ where: { action: "editor.decision" } });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        actorId: moderator.id,
        targetId: applicant.id,
        metadata: { from: "PENDING", to: "INDEPENDENT" },
      });
    });
  });

  describe("conflict of interest (SPEC §2.3)", () => {
    it("hides the application and refuses the decision", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await prisma.user.update({
        where: { id: moderator.id },
        data: { conflictEditorIds: [applicant.id] },
      });

      const list = await server()
        .get("/moderation/editor-applications")
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(200);
      expect(editorPage.parse(list.body).items).toHaveLength(0);

      const response = await decide(moderator.accessToken, applicant.id, {
        status: "INDEPENDENT",
      }).expect(403);
      expect(response.body).toMatchObject({ code: "CONFLICT_OF_INTEREST" });
    });
  });

  describe("documents (docs/DECISIONS.md)", () => {
    it("streams a document to a moderator and audits the reading", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      const response = await server()
        .get(`/moderation/editor-applications/${applicant.id}/documents/0`)
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(response.headers["content-type"]).toBe("application/pdf");
      expect(Buffer.isBuffer(response.body) && response.body.equals(TEST_PDF)).toBe(true);
      const logs = await prisma.auditLog.findMany({ where: { action: "editor.document.read" } });
      expect(logs).toMatchObject([{ actorId: moderator.id, targetId: applicant.id }]);
    });

    it("answers 404 for a document that does not exist", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await server()
        .get(`/moderation/editor-applications/${applicant.id}/documents/3`)
        .set("Authorization", `Bearer ${moderator.accessToken}`)
        .expect(404);
    });

    it("refuses the applicant themselves", async () => {
      const applicant = await createApplicant(app, prisma, "clara");
      await server()
        .get(`/moderation/editor-applications/${applicant.id}/documents/0`)
        .set("Authorization", `Bearer ${applicant.accessToken}`)
        .expect(403);
    });
  });
});
