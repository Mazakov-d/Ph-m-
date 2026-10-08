import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedRequest } from "../common/authenticated-request.js";
import { OPTIONAL_AUTH_KEY } from "../common/decorators/optional-auth.decorator.js";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator.js";
import { ApiException } from "../common/errors/api.exception.js";
import { type AccessTokenPayload, AuthService } from "./auth.service.js";

const BEARER_PREFIX = "Bearer ";

/**
 * Global guard: every route needs a valid access token unless marked @Public() (token ignored)
 * or @OptionalAuth() (token optional, but checked when present).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // The WebSocket gateway authenticates its connections itself (no HTTP headers there).
    if (context.getType() !== "http") {
      return true;
    }
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const isOptional = this.reflector.getAllAndOverride<boolean | undefined>(
      OPTIONAL_AUTH_KEY,
      targets,
    );
    if (!header && isOptional) {
      // Anonymous visitor on a route open to everyone.
      return true;
    }
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw unauthenticated("Missing access token");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice(BEARER_PREFIX.length));
    } catch {
      throw unauthenticated("Invalid or expired access token");
    }

    // Read fresh: the role or a suspension may have changed since the token was issued.
    const user = await this.authService.findAuthUser(payload.sub);
    if (!user) {
      throw unauthenticated("Unknown account");
    }
    request.user = user;
    return true;
  }
}

function unauthenticated(message: string): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", message);
}
