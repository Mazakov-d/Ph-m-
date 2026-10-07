import { z } from "zod";
import { UserRole } from "../enums.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * SPEC §2.1: internal data of an account, for moderators only
 * (never in a public response: creation date, report history, restrictions).
 */
export const userModerationSchema = z.object({
  id: idSchema,
  pseudo: z.string(),
  role: UserRole,
  createdAt: isoDateTimeSchema,
  upheldReportCount: z.number().int().nonnegative(),
  dismissedReportCount: z.number().int().nonnegative(),
  suspendedUntil: isoDateTimeSchema.nullable(),
  bannedAt: isoDateTimeSchema.nullable(),
});
export type UserModeration = z.infer<typeof userModerationSchema>;

// SPEC §10: blocking a user hides their posts and comments from the blocker.
export const createBlockInputSchema = z.object({
  blockedUserId: idSchema,
});
export type CreateBlockInput = z.infer<typeof createBlockInputSchema>;

export const blockPublicSchema = z.object({
  blockedUserId: idSchema,
  blockedPseudo: z.string(),
  createdAt: isoDateTimeSchema,
});
export type BlockPublic = z.infer<typeof blockPublicSchema>;
