import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Res } from "@nestjs/common";
import {
  type AuthSession,
  type AuthUser,
  CLIENT_KIND_HEADER,
  ClientKind,
  type LoginInput,
  loginInputSchema,
  MILLISECONDS_PER_DAY,
  REFRESH_TOKEN_TTL_DAYS,
  type RefreshTokenInput,
  refreshTokenInputSchema,
  type RegisterInput,
  registerInputSchema,
} from "@fama/shared";
import type { CookieOptions, Response } from "express";
import { Cookie } from "../common/decorators/cookie.decorator.js";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { ApiException } from "../common/errors/api.exception.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { AuthService, type IssuedSession } from "./auth.service.js";

export const REFRESH_COOKIE_NAME = "fama_refresh";

// docs/DECISIONS.md: httpOnly (unreadable by JavaScript), Secure, SameSite=Strict,
// only sent to the /auth routes.
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/auth",
};

// The web client may send no body at all (its refresh token is in the cookie).
const refreshBodySchema = refreshTokenInputSchema.default({});

function isWebClient(header: string | undefined): boolean {
  return ClientKind.safeParse(header).data === "web";
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body(new ZodValidationPipe(registerInputSchema)) input: RegisterInput,
    @Headers(CLIENT_KIND_HEADER) clientKind: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    const session = await this.authService.register(input);
    return this.sendSession(session, isWebClient(clientKind), response);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) input: LoginInput,
    @Headers(CLIENT_KIND_HEADER) clientKind: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    const session = await this.authService.login(input);
    return this.sendSession(session, isWebClient(clientKind), response);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(refreshBodySchema)) input: RefreshTokenInput,
    @Cookie(REFRESH_COOKIE_NAME) cookieToken: string | undefined,
    @Headers(CLIENT_KIND_HEADER) clientKind: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    const refreshToken = input.refreshToken ?? cookieToken;
    if (!refreshToken) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "No refresh token");
    }
    const session = await this.authService.refresh(refreshToken);
    return this.sendSession(session, isWebClient(clientKind), response);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshBodySchema)) input: RefreshTokenInput,
    @Cookie(REFRESH_COOKIE_NAME) cookieToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = input.refreshToken ?? cookieToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  /** Web: refresh token in the httpOnly cookie only. Native: in the body (SecureStore). */
  private sendSession(session: IssuedSession, isWeb: boolean, response: Response): AuthSession {
    if (isWeb) {
      response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_TTL_DAYS * MILLISECONDS_PER_DAY,
      });
    }
    return {
      user: session.user,
      tokens: {
        accessToken: session.accessToken,
        refreshToken: isWeb ? null : session.refreshToken,
      },
    };
  }
}
