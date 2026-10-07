import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { can, isRestricted, type Permission } from "@fama/shared";
import type { AuthenticatedRequest } from "../authenticated-request.js";
import { REQUIRED_PERMISSION_KEY } from "../decorators/require-permission.decorator.js";
import { ApiException } from "../errors/api.exception.js";

/** Authorizes routes marked @RequirePermission() with can() from `shared` (SPEC §2.5). */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user ?? null;
    if (can(user, permission)) {
      return true;
    }
    if (!user) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign-in required");
    }
    // SPEC §6.3: say explicitly when the refusal comes from a suspension or a ban.
    const allowedIfNotRestricted = can(
      { ...user, suspendedUntil: null, bannedAt: null },
      permission,
    );
    if (isRestricted(user, new Date()) && allowedIfNotRestricted) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "ACCOUNT_RESTRICTED",
        "This account is suspended or banned",
      );
    }
    throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", `Missing permission ${permission}`);
  }
}
