import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { GuardTestController } from "./support/guard-test.controller.js";
import { signUp } from "./support/users.js";

describe("Authentication and permission guards (e2e)", () => {
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

  const server = () => request(app.getHttpServer());

  describe("JwtAuthGuard", () => {
    it("lets anyone reach a @Public() route", async () => {
      await server().get("/guard-test/public").expect(200);
      await server().get("/health").expect(200);
    });

    it("refuses a protected route without token (401)", async () => {
      const response = await server().get("/auth/me").expect(401);
      expect(response.body).toEqual({ code: "UNAUTHENTICATED", message: "Missing access token" });
    });

    it("refuses a malformed token", async () => {
      await server().get("/auth/me").set("Authorization", "Bearer abc.def.ghi").expect(401);
    });

    it("refuses a token signed with another secret", async () => {
      const { id } = await signUp(app, prisma, "lea");
      const forged = await new JwtService({ secret: "not-the-secret" }).signAsync({ sub: id });
      await server().get("/auth/me").set("Authorization", `Bearer ${forged}`).expect(401);
    });

    it("refuses an expired token", async () => {
      const { id } = await signUp(app, prisma, "lea");
      const expired = await app.get(JwtService).signAsync({ sub: id }, { expiresIn: -1 });
      await server().get("/auth/me").set("Authorization", `Bearer ${expired}`).expect(401);
    });

    it("refuses the token of an account that no longer exists", async () => {
      const { accessToken } = await signUp(app, prisma, "lea");
      await truncateAllTables(prisma);
      await server().get("/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(401);
    });

    it("gives the account to the route with a valid token", async () => {
      const { accessToken } = await signUp(app, prisma, "lea");
      const me = await server().get("/auth/me").set("Authorization", `Bearer ${accessToken}`);
      expect(me.status).toBe(200);
      expect(me.body).toMatchObject({ pseudo: "lea", role: "READER" });
      expect(me.body).not.toHaveProperty("passwordHash");

      const response = await server()
        .get("/guard-test/private")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body).toEqual({ pseudo: "lea" });
    });
  });

  describe("PermissionGuard (SPEC §2.5)", () => {
    it("refuses post.create to a reader (403)", async () => {
      const { accessToken } = await signUp(app, prisma, "lecteur");
      const response = await server()
        .post("/guard-test/publish")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
      expect(response.body).toMatchObject({ code: "FORBIDDEN" });
    });

    it("refuses post.create to a PENDING editor", async () => {
      const { accessToken } = await signUp(app, prisma, "attente", {
        role: "EDITOR",
        editorStatus: "PENDING",
      });
      await server()
        .post("/guard-test/publish")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
    });

    it("allows post.create to an INDEPENDENT editor", async () => {
      const { accessToken } = await signUp(app, prisma, "clara", {
        role: "EDITOR",
        editorStatus: "INDEPENDENT",
      });
      await server()
        .post("/guard-test/publish")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("applies a role change at once, without a new token", async () => {
      const { id, accessToken } = await signUp(app, prisma, "promu");
      await prisma.user.update({ where: { id }, data: { role: "EDITOR" } });
      await prisma.editorProfile.create({
        data: { userId: id, status: "CERTIFIED", editorialLine: "Ligne", ownerName: "Nom" },
      });
      await server()
        .post("/guard-test/publish")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  describe("suspended or banned accounts (SPEC §6.3, docs/DECISIONS.md)", () => {
    const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

    it("refuses a write to a suspended account with ACCOUNT_RESTRICTED", async () => {
      const { accessToken } = await signUp(app, prisma, "suspendu", { suspendedUntil: tomorrow() });
      const response = await server()
        .post("/guard-test/comment")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
      expect(response.body).toMatchObject({ code: "ACCOUNT_RESTRICTED" });
    });

    it("refuses a write to a banned account", async () => {
      const { accessToken } = await signUp(app, prisma, "banni", { bannedAt: new Date() });
      const response = await server()
        .post("/guard-test/comment")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
      expect(response.body).toMatchObject({ code: "ACCOUNT_RESTRICTED" });
    });

    it("still lets a suspended account read and contact the team", async () => {
      const { accessToken } = await signUp(app, prisma, "suspendu", { suspendedUntil: tomorrow() });
      await server().get("/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
      await server()
        .post("/guard-test/support")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("allows writing again once the suspension has ended", async () => {
      const { accessToken } = await signUp(app, prisma, "libere", {
        suspendedUntil: new Date(Date.now() - 1000),
      });
      await server()
        .post("/guard-test/comment")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("keeps FORBIDDEN when the role lacks the permission anyway", async () => {
      const { accessToken } = await signUp(app, prisma, "suspendu", { suspendedUntil: tomorrow() });
      const response = await server()
        .post("/guard-test/publish")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(403);
      expect(response.body).toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
