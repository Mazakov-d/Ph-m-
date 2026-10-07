// API error codes. Every error response has the shape { code, message } (CLAUDE.md §5.3).
import { z } from "zod";

export const ErrorCode = z.enum([
  // Generic
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  // Accounts (SPEC §2.1)
  "EMAIL_TAKEN",
  "PSEUDO_TAKEN",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  // SPEC §6.3: suspended or banned account trying to write.
  "ACCOUNT_RESTRICTED",
  // Editors (SPEC §2.2)
  "EDITOR_APPLICATION_EXISTS",
  "EDITOR_NOT_VALIDATED",
  // Posts and comments (SPEC §3, §6)
  "COMMENTS_DISABLED",
  "INVALID_PARENT_COMMENT",
  "COMMENT_UNDER_REVIEW",
  "TOXIC_CONTENT",
  // Reports (SPEC §5.1, §6.2)
  "ALREADY_REPORTED",
  "CANNOT_REPORT_OWN_CONTENT",
  "COMMENT_ALREADY_VERIFIED",
  // Votes (SPEC §7)
  "NOT_AN_OPINION",
  // Reviews, sanctions and appeals (SPEC §2.3, §5.5, §6.3)
  "CONFLICT_OF_INTEREST",
  "ALREADY_REVIEWED",
  "REPLY_WINDOW_CLOSED",
  "APPEAL_ALREADY_USED",
  "SAME_MODERATOR_APPEAL",
  // Tickets (SPEC §8)
  "TICKET_ALREADY_ASSIGNED",
  "TICKET_CLOSED",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const apiErrorSchema = z.object({
  code: ErrorCode,
  message: z.string(),
  // Only for VALIDATION_ERROR: which fields are invalid.
  issues: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
