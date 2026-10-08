import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { truncateAllTables } from "../../test/support/database.js";
import { ApiException } from "../common/errors/api.exception.js";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthModule } from "./auth.module.js";
import { type AccessTokenPayload, AuthService } from "./auth.service.js";
import { hashRefreshToken } from "./refresh-token.js";

const PASSWORD = "mot-de-passe-solide";
const LEA = { email: "lea@test.fr", password: PASSWORD, pseudo: "Léa" };

async function expectApiError(promise: Promise<unknown>, code: string, status: number) {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiException);
  if (error instanceof ApiException) {
    expect(error.getStatus()).toBe(status);
    expect(error.getResponse()).toMatchObject({ code });
  }
}

describe("AuthService", () => {
  let auth: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, RateLimitModule, AuthModule],
    }).compile();
    auth = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
    jwt = moduleRef.get(JwtService);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("register", () => {
    it("creates a reader and returns a session", async () => {
      const session = await auth.register(LEA);

      expect(session.user).toMatchObject({ email: "lea@test.fr", pseudo: "Léa", role: "READER" });
      const payload = await jwt.verifyAsync<AccessTokenPayload>(session.accessToken);
      expect(payload.sub).toBe(session.user.id);
    });

    it("stores an argon2 hash, never the password", async () => {
      await auth.register(LEA);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: LEA.email } });
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).not.toContain(PASSWORD);
    });

    it("stores only the hash of the refresh token", async () => {
      const session = await auth.register(LEA);
      const token = await prisma.refreshToken.findFirstOrThrow();
      expect(token.tokenHash).toBe(hashRefreshToken(session.refreshToken));
    });

    it("rejects an e-mail already registered", async () => {
      await auth.register(LEA);
      await expectApiError(auth.register({ ...LEA, pseudo: "Autre" }), "EMAIL_TAKEN", 409);
    });

    it("rejects a pseudo already taken, whatever its case", async () => {
      await auth.register(LEA);
      await expectApiError(
        auth.register({ ...LEA, email: "autre@test.fr", pseudo: "LÉA" }),
        "PSEUDO_TAKEN",
        409,
      );
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      await auth.register(LEA);
    });

    it("opens a session with the right password", async () => {
      const session = await auth.login({ email: LEA.email, password: PASSWORD });
      expect(session.user.pseudo).toBe("Léa");
    });

    it("rejects a wrong password", async () => {
      await expectApiError(
        auth.login({ email: LEA.email, password: "mauvais-mot-de-passe" }),
        "INVALID_CREDENTIALS",
        401,
      );
    });

    it("gives the same error for an unknown e-mail", async () => {
      await expectApiError(
        auth.login({ email: "inconnu@test.fr", password: PASSWORD }),
        "INVALID_CREDENTIALS",
        401,
      );
    });
  });

  describe("refresh", () => {
    it("issues a new session and revokes the used token (rotation)", async () => {
      const first = await auth.register(LEA);
      const second = await auth.refresh(first.refreshToken);

      expect(second.user.id).toBe(first.user.id);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await expectApiError(auth.refresh(first.refreshToken), "INVALID_REFRESH_TOKEN", 401);
    });

    it("lets only one of two concurrent refreshes succeed", async () => {
      const { refreshToken } = await auth.register(LEA);
      const results = await Promise.allSettled([
        auth.refresh(refreshToken),
        auth.refresh(refreshToken),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    });

    it("rejects an expired token", async () => {
      const { refreshToken } = await auth.register(LEA);
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1) } });
      await expectApiError(auth.refresh(refreshToken), "INVALID_REFRESH_TOKEN", 401);
    });

    it("rejects an unknown token", async () => {
      await expectApiError(auth.refresh("not-a-real-token"), "INVALID_REFRESH_TOKEN", 401);
    });
  });

  describe("logout", () => {
    it("revokes the refresh token", async () => {
      const { refreshToken } = await auth.register(LEA);
      await auth.logout(refreshToken);
      await expectApiError(auth.refresh(refreshToken), "INVALID_REFRESH_TOKEN", 401);
    });
  });
});
