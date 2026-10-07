import { z } from "zod";
import { CommentStatus } from "../enums.js";
import { COMMENT_MAX_LENGTH } from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

// SPEC §6: replies on one level (parentId points to a root comment, checked by the API).
export const createCommentInputSchema = z.object({
  postId: idSchema,
  parentId: idSchema.nullable(),
  content: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

export const commentPublicSchema = z.object({
  id: idSchema,
  postId: idSchema,
  parentId: idSchema.nullable(),
  // Needed for « Bloquer cet utilisateur » (SPEC §10); the pseudo is not clickable (SPEC §2.1).
  authorId: idSchema,
  authorPseudo: z.string(),
  // SPEC §6: null when UNDER_REVIEW, REMOVED or DELETED.
  content: z.string().nullable(),
  status: CommentStatus,
  createdAt: isoDateTimeSchema,
});
export type CommentPublic = z.infer<typeof commentPublicSchema>;

/** Comment as seen by moderators: content always visible, plus the report score. */
export const commentModerationSchema = commentPublicSchema.extend({
  content: z.string(),
  reportCount: z.number().int().nonnegative(),
  totalReportWeight: z.number().nonnegative(),
});
export type CommentModeration = z.infer<typeof commentModerationSchema>;

// SPEC §6.2 step 4: compliant → VERIFIED; non-compliant → REMOVED + sanction (computed by the API).
export const commentDecisionInputSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("VERIFIED") }),
  z.object({
    decision: z.literal("REMOVED"),
    // SPEC §6.3: discrimination confirmed by a human → permanent ban.
    isDiscrimination: z.boolean(),
    // SPEC §6.3: « À signaler sur PHAROS » box.
    reportToPharos: z.boolean(),
  }),
]);
export type CommentDecisionInput = z.infer<typeof commentDecisionInputSchema>;
