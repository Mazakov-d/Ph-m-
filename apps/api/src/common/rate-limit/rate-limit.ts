import { applyDecorators, Injectable, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../authenticated-request.js";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

/** Counts per account when signed in, otherwise per IP address (docs/DECISIONS.md). */
@Injectable()
export class AccountOrIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: AuthenticatedRequest): Promise<string> {
    return Promise.resolve(
      request.user ? `user:${request.user.id}` : `ip:${request.ip ?? "unknown"}`,
    );
  }
}

/** Limits a route to `limit` requests per window (429 RATE_LIMITED beyond). */
export function RateLimit(rule: { limit: number; windowMinutes: number }) {
  return applyDecorators(
    Throttle({ default: { limit: rule.limit, ttl: rule.windowMinutes * MILLISECONDS_PER_MINUTE } }),
    UseGuards(AccountOrIpThrottlerGuard),
  );
}
