import { SetMetadata } from "@nestjs/common";

export const OPTIONAL_AUTH_KEY = "optionalAuth";

/**
 * Route open to anonymous visitors that still identifies a signed-in reader (e.g. the feed
 * hides the authors they blocked). An invalid or expired token is refused (401), so the app
 * refreshes its session instead of silently getting an anonymous answer.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
