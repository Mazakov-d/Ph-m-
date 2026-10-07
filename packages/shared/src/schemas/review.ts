import { z } from "zod";
import { Verdict } from "../enums.js";
import {
  APPEAL_MAX_LENGTH,
  EDITOR_REPLY_MAX_LENGTH,
  REVIEW_NOTE_MAX_LENGTH,
  SOURCES_MAX_COUNT,
} from "../rules.js";
import { idSchema, isoDateTimeSchema, sourceSchema } from "./common.js";
import { postSummaryPublicSchema } from "./post.js";
import { reportModerationSchema } from "./report.js";

// SPEC §5.5: verdict, mandatory public note and at least one source.
export const createReviewInputSchema = z.object({
  verdict: Verdict,
  publicNote: z.string().trim().min(1).max(REVIEW_NOTE_MAX_LENGTH),
  sources: z.array(sourceSchema).min(1).max(SOURCES_MAX_COUNT),
});
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;

// SPEC §5.5: the editor replies within EDITOR_REPLY_HOURS (checked by the API).
export const createEditorReplyInputSchema = z.object({
  content: z.string().trim().min(1).max(EDITOR_REPLY_MAX_LENGTH),
});
export type CreateEditorReplyInput = z.infer<typeof createEditorReplyInputSchema>;

// SPEC §3: a published post only changes through a public correction.
export const createPostCorrectionInputSchema = z.object({
  content: z.string().trim().min(1).max(EDITOR_REPLY_MAX_LENGTH),
});
export type CreatePostCorrectionInput = z.infer<typeof createPostCorrectionInputSchema>;

// SPEC §5.5 and §6.3: one appeal per verdict or sanction, handled by another moderator.
export const createAppealInputSchema = z.object({
  reason: z.string().trim().min(1).max(APPEAL_MAX_LENGTH),
});
export type CreateAppealInput = z.infer<typeof createAppealInputSchema>;

/** SPEC §5.6: content of the « Pourquoi ? » sheet. */
export const reviewPublicSchema = z.object({
  id: idSchema,
  postId: idSchema,
  verdict: Verdict,
  publicNote: z.string(),
  sources: z.array(z.string()),
  createdAt: isoDateTimeSchema,
  editorReply: z.object({ content: z.string(), createdAt: isoDateTimeSchema }).nullable(),
});
export type ReviewPublic = z.infer<typeof reviewPublicSchema>;

/** SPEC §5.4: an entry of the review queue, sorted by priority. */
export const reviewQueueItemModerationSchema = z.object({
  post: postSummaryPublicSchema,
  viewCount: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
  priority: z.number().nonnegative(),
  reports: z.array(reportModerationSchema),
});
export type ReviewQueueItemModeration = z.infer<typeof reviewQueueItemModerationSchema>;
