import type { INestApplication } from "@nestjs/common";
import { authSessionSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";

const LEA = { email: "lea@test.fr", password: "mot-de-passe-solide", pseudo: "Léa" };

function refreshCookieOf(response: request.Response): string {
  const cookies: unknown = response.headers["set-cookie"];
  const list = Array.isArray(cookies) ? cookies.filter((c) => typeof c === "string") : [];
  const cookie = list.find((c) => c.startsWith("fama_refresh="));
  if (!cookie) {
    throw new Error("No fama_refresh cookie in the response");
  }
  return cookie;
}

describe("Auth routes (e2e)", () => {
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

  describe("native client", () => {
    it("registers and returns both tokens in the body", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(LEA)
        .expect(201);

      const session = authSessionSchema.parse(response.body);
      expect(session.tokens.refreshToken).toEqual(expect.any(String));
      expect(response.headers["set-cookie"]).toBeUndefined();
    });

    it("refreshes with the token sent in the body", async () => {
      const registered = await request(app.getHttpServer()).post("/auth/register").send(LEA);
      const { tokens } = authSessionSchema.parse(registered.body);

      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);
    });

    it("rejects an invalid sign-up with the fields at fault", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ ...LEA, password: "court" })
        .expect(400);

      expect(response.body).toMatchObject({
        code: "VALIDATION_ERROR",
        issues: [{ path: ["password"] }],
      });
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post("/auth/register").send(LEA).expect(201);
    });

    it("signs in with the right password and reaches a protected route", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: LEA.email, password: LEA.password })
        .expect(200);
      const { tokens } = authSessionSchema.parse(response.body);

      const me = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ email: LEA.email, pseudo: LEA.pseudo });
    });

    it("accepts the e-mail whatever its case", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "LEA@Test.fr", password: LEA.password })
        .expect(200);
    });

    it("refuses a wrong password with INVALID_CREDENTIALS", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: LEA.email, password: "mauvais-mot-de-passe" })
        .expect(401);
      expect(response.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
    });

    it("refuses a taken pseudo at sign-up with PSEUDO_TAKEN", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ ...LEA, email: "autre@test.fr", pseudo: "léa" })
        .expect(409);
      expect(response.body).toMatchObject({ code: "PSEUDO_TAKEN" });
    });
  });

  describe("web client (docs/DECISIONS.md)", () => {
    it("puts the refresh token in an httpOnly cookie only", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .set("x-fama-client", "web")
        .send(LEA)
        .expect(201);

      expect(authSessionSchema.parse(response.body).tokens.refreshToken).toBeNull();
      const cookie = refreshCookieOf(response);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Strict");
      expect(cookie).toContain("Path=/auth");
    });

    it("refreshes with the cookie, then logs out and clears it", async () => {
      const registered = await request(app.getHttpServer())
        .post("/auth/register")
        .set("x-fama-client", "web")
        .send(LEA);
      const cookie = refreshCookieOf(registered).split(";")[0] ?? "";

      const refreshed = await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("x-fama-client", "web")
        .set("Cookie", cookie)
        .expect(200);
      const newCookie = refreshCookieOf(refreshed).split(";")[0] ?? "";

      const loggedOut = await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Cookie", newCookie)
        .expect(204);
      expect(refreshCookieOf(loggedOut)).toContain("fama_refresh=;");

      await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("x-fama-client", "web")
        .set("Cookie", newCookie)
        .expect(401);
    });

    it("rejects a refresh without any token", async () => {
      const response = await request(app.getHttpServer()).post("/auth/refresh").expect(401);
      expect(response.body).toMatchObject({ code: "INVALID_REFRESH_TOKEN" });
    });
  });
});
