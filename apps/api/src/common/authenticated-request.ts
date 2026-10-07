import type { AuthUser } from "@fama/shared";
import type { Request } from "express";

/** A request after JwtAuthGuard: `user` is set on every non-public route. */
export type AuthenticatedRequest = Request & { user?: AuthUser };
