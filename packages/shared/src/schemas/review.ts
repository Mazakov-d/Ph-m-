import { z } from "zod";
import { Verdict } from "../enums.js";
import {
  APPEAL_MAX_LENGTH,
  EDITOR_REPLY_MAX_LENGTH,
  REVIEW_NOTE_MAX_LENGTH,
  SOURCES_MAX_COUNT,
} from "../rules.js";
import { idSchema, isoDateTimeSchema, sourceSchema } from "./common.js";
import { juryModerationSchema, juryPublicSchema } from "./jury.js";
import { postSummaryPublicSchema } from "./post.js";
import { reportModerationSchema } from "./report.js";

// SPEC §5.5: verdict, mandatory public note and at least one source. docs/DECISIONS.md (§5.8):
// `juryDisagreement` explains publicly a verdict other than the jury's majority (required then).
export const createReviewInputSchema = z.object({
  verdict: Verdict,
  publicNote: z.string().trim().min(1).max(REVIEW_NOTE_MAX_LENGTH),
  sources: z.array(sourceSchema).min(1).max(SOURCES_MAX_COUNT),
  juryDisagreement: z.string().trim().min(1).max(REVIEW_NOTE_MAX_LENGTH).nullable().default(null),
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
  // docs/DECISIONS.md: one appeal per post; NONE → PENDING → DECIDED (no further appeal).
  appealState: z.enum(["NONE", "PENDING", "DECIDED"]),
  // SPEC §5.8: the opinion of the jury (anonymous), and why the verdict departs from it.
  jury: juryPublicSchema.nullable(),
  juryDisagreement: z.string().nullable(),
});
export type ReviewPublic = z.infer<typeof reviewPublicSchema>;

/** docs/DECISIONS.md: an appeal waiting for another moderator. */
export const appealModerationSchema = z.object({
  id: idSchema,
  post: postSummaryPublicSchema,
  review: reviewPublicSchema,
  reviewModeratorId: idSchema,
  reason: z.string(),
  createdAt: isoDateTimeSchema,
});
export type AppealModeration = z.infer<typeof appealModerationSchema>;

/** SPEC §5.4: an entry of the review queue, sorted by priority. */
export const reviewQueueItemModerationSchema = z.object({
  post: postSummaryPublicSchema,
  viewCount: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
  priority: z.number().nonnegative(),
  reports: z.array(reportModerationSchema),
  // SPEC §5.8: the jury of the article (null when no reader could be drawn).
  jury: juryModerationSchema.nullable(),
});
export type ReviewQueueItemModeration = z.infer<typeof reviewQueueItemModerationSchema>;
