import { z } from "zod";
import { SanctionType } from "../enums.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

/** SPEC §6.3: a sanction, shown to the sanctioned user on « Mes sanctions ». */
export const sanctionPublicSchema = z.object({
  id: idSchema,
  type: SanctionType,
  // The removed comment that caused the sanction.
  commentId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  // End of a suspension; null for a warning or a permanent ban.
  endsAt: isoDateTimeSchema.nullable(),
  // The removed opinion that caused it (SPEC §6.3: same rules for the editors' posts).
  postId: idSchema.nullable(),
  // SPEC §6.3: a sanction can be appealed once (docs/DECISIONS.md: no deadline).
  appealState: z.enum(["NONE", "PENDING", "ACCEPTED", "REJECTED"]),
  // Set when the sanction was cancelled on appeal.
  liftedAt: isoDateTimeSchema.nullable(),
});
export type SanctionPublic = z.infer<typeof sanctionPublicSchema>;

/** docs/DECISIONS.md: a sanction appeal waiting for another moderator or an admin. */
export const sanctionAppealModerationSchema = z.object({
  id: idSchema,
  sanction: sanctionPublicSchema,
  sanctionedPseudo: z.string(),
  sanctionModeratorId: idSchema,
  // The content that caused the sanction, for the decision.
  content: z.string().nullable(),
  reason: z.string(),
  createdAt: isoDateTimeSchema,
});
export type SanctionAppealModeration = z.infer<typeof sanctionAppealModerationSchema>;

export const sanctionAppealDecisionInputSchema = z.object({
  accepted: z.boolean(),
});
export type SanctionAppealDecisionInput = z.infer<typeof sanctionAppealDecisionInputSchema>;

/** docs/DECISIONS.md: an opinion with pending reports, for moderators. */
export const postModerationDecisionInputSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("COMPLIANT") }),
  z.object({
    decision: z.literal("REMOVED"),
    isDiscrimination: z.boolean(),
    reportToPharos: z.boolean(),
  }),
]);
export type PostModerationDecisionInput = z.infer<typeof postModerationDecisionInputSchema>;

/** Result of a moderation decision: the sanction issued, if the content was removed. */
export const moderationDecisionResultSchema = z.object({
  sanction: sanctionPublicSchema.nullable(),
});
export type ModerationDecisionResult = z.infer<typeof moderationDecisionResultSchema>;
