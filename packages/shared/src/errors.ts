// API error codes. Every error response has the shape { code, message } (CLAUDE.md §5.3).
import { z } from "zod";

export const ErrorCode = z.enum([
  // Generic
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  // An uploaded file exceeds its size limit.
  "FILE_TOO_LARGE",
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
  "INVALID_DOCUMENT",
  // A decision that does not apply to the current status (e.g. validating a rejected application).
  "INVALID_STATUS_TRANSITION",
  // Posts and comments (SPEC §3, §6)
  "INVALID_IMAGE",
  // docs/DECISIONS.md (videos): not a readable MP4 or MOV video, or longer than 3 minutes.
  "INVALID_VIDEO",
  "VIDEO_TOO_LONG",
  // SPEC §3: comments cannot be turned off on an opinion.
  "COMMENTS_REQUIRED_FOR_OPINION",
  "COMMENTS_DISABLED",
  // docs/DECISIONS.md: an opinion removed by moderation.
  "POST_REMOVED",
  "INVALID_PARENT_COMMENT",
  "COMMENT_UNDER_REVIEW",
  "TOXIC_CONTENT",
  // Reports (SPEC §5.1, §6.2)
  "ALREADY_REPORTED",
  "CANNOT_REPORT_OWN_CONTENT",
  "COMMENT_ALREADY_VERIFIED",
  // Votes (SPEC §7): one final action per opinion, vote or « Voir sans voter ».
  "NOT_AN_OPINION",
  "VOTE_ALREADY_CAST",
  "VOTE_LOCKED_AFTER_REVEAL",
  // Reviews, sanctions and appeals (SPEC §2.3, §5.5, §6.3)
  "CONFLICT_OF_INTEREST",
  "ALREADY_REVIEWED",
  "REPLY_WINDOW_CLOSED",
  "ALREADY_REPLIED",
  "APPEAL_WINDOW_CLOSED",
  "APPEAL_ALREADY_USED",
  "SAME_MODERATOR_APPEAL",
  // Tickets (SPEC §8)
  "TICKET_ALREADY_ASSIGNED",
  "TICKET_CLOSED",
  // docs/DECISIONS.md (push notifications): ALERTS_MAX alerts per account.
  "ALERTS_LIMIT_REACHED",
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
