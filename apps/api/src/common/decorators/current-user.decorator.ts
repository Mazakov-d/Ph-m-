import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@fama/shared";
import type { AuthenticatedRequest } from "../authenticated-request.js";

/** The signed-in account. Only valid on non-public routes. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new Error("@CurrentUser() used on a route without authentication");
  }
  const user: AuthUser = request.user;
  return user;
});

/** The signed-in account on an @OptionalAuth() route, or null for an anonymous visitor. */
export const OptionalUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user: AuthUser | null =
    context.switchToHttp().getRequest<AuthenticatedRequest>().user ?? null;
  return user;
});
