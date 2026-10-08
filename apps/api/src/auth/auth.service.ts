import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  type AuthUser,
  type LoginInput,
  MILLISECONDS_PER_DAY,
  REFRESH_TOKEN_TTL_DAYS,
  type RegisterInput,
} from "@fama/shared";
import { hash, verify } from "argon2";
import { ApiException } from "../common/errors/api.exception.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toAuthUser, type UserWithEditorProfile } from "./auth.mapper.js";
import { generateRefreshToken, hashRefreshToken } from "./refresh-token.js";

const WITH_EDITOR_STATUS = { editorProfile: { select: { status: true } } } as const;

/** What the access token carries: only the account id, the rest is read fresh from the database. */
export type AccessTokenPayload = { sub: string };

const MILLISECONDS_PER_SECOND = 1000;

/** A new session; the controller decides how the refresh token reaches the client. */
export type IssuedSession = { user: AuthUser; accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // SPEC §2.1: sign-up with e-mail, password (argon2, SPEC §10) and unique pseudo.
  async register(input: RegisterInput): Promise<IssuedSession> {
    const passwordHash = await hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: input.email, pseudo: input.pseudo, passwordHash },
        include: WITH_EDITOR_STATUS,
      });
      return await this.createSession(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw await this.duplicateAccountError(input.email);
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: WITH_EDITOR_STATUS,
    });
    // Same error for an unknown e-mail and a wrong password: do not reveal which accounts exist.
    if (!user || !(await verify(user.passwordHash, input.password))) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "INVALID_CREDENTIALS",
        "Invalid e-mail or password",
      );
    }
    return this.createSession(user);
  }

  /** Rotation: the refresh token is revoked and replaced by a new one, in one transaction. */
  async refresh(refreshToken: string): Promise<IssuedSession> {
    const now = new Date();
    const tokenHash = hashRefreshToken(refreshToken);
    const userId = await this.prisma.$transaction(async (tx) => {
      // Conditional update (CLAUDE.md §5.3): two concurrent refreshes cannot both succeed.
      const revoked = await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        return null;
      }
      const token = await tx.refreshToken.findUniqueOrThrow({ where: { tokenHash } });
      return token.userId;
    });
    if (userId === null) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid, expired or revoked",
      );
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: WITH_EDITOR_STATUS,
    });
    return this.createSession(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * The account of a valid access token and when the token expires, or null (invalid, expired,
   * unknown or deleted account). Used by the real-time conversations (docs/DECISIONS.md).
   */
  async authenticateAccessToken(
    token: string,
  ): Promise<{ user: AuthUser; expiresAt: Date } | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload & { exp: number }>(token);
      const user = await this.findAuthUser(payload.sub);
      return user ? { user, expiresAt: new Date(payload.exp * MILLISECONDS_PER_SECOND) } : null;
    } catch {
      return null;
    }
  }

  /** The account behind a valid access token, read fresh (role and suspension may have changed). */
  async findAuthUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: WITH_EDITOR_STATUS,
    });
    // SPEC §10: a deleted account is no longer anyone.
    return user && !user.deletedAt ? toAuthUser(user) : null;
  }

  private async createSession(user: UserWithEditorProfile): Promise<IssuedSession> {
    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * MILLISECONDS_PER_DAY),
      },
    });
    const payload: AccessTokenPayload = { sub: user.id };
    const accessToken = await this.jwt.signAsync(payload);
    return { user: toAuthUser(user), accessToken, refreshToken };
  }

  private async duplicateAccountError(email: string): Promise<ApiException> {
    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    return emailTaken
      ? new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "This e-mail is already registered")
      : new ApiException(HttpStatus.CONFLICT, "PSEUDO_TAKEN", "This pseudo is already taken");
  }
}
