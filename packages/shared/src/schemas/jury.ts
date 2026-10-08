import { z } from "zod";
import { JuryAssignmentStatus, Verdict } from "../enums.js";
import { JURY_NOTE_MAX_LENGTH } from "../rules.js";
import { idSchema, isoDateTimeSchema, sourceSchema } from "./common.js";
import { postSummaryPublicSchema } from "./post.js";

// SPEC §5.8: a juror's vote — one of the verdicts, with a mandatory source.
export const juryVoteInputSchema = z.object({
  verdict: Verdict,
  source: sourceSchema,
  note: z.string().trim().min(1).max(JURY_NOTE_MAX_LENGTH).nullable(),
});
export type JuryVoteInput = z.infer<typeof juryVoteInputSchema>;

// docs/DECISIONS.md: a reader volunteers (or stops) to sit on juries.
export const updateJuryVolunteerInputSchema = z.object({ volunteer: z.boolean() });
export type UpdateJuryVolunteerInput = z.infer<typeof updateJuryVolunteerInputSchema>;

export const juryVolunteerPublicSchema = z.object({ volunteer: z.boolean() });
export type JuryVolunteerPublic = z.infer<typeof juryVolunteerPublicSchema>;

/** A seat of the signed-in reader on a jury, with the article to examine. */
export const juryAssignmentPublicSchema = z.object({
  id: idSchema,
  post: postSummaryPublicSchema,
  status: JuryAssignmentStatus,
  deadline: isoDateTimeSchema,
  vote: z.object({ verdict: Verdict, source: z.string(), note: z.string().nullable() }).nullable(),
});
export type JuryAssignmentPublic = z.infer<typeof juryAssignmentPublicSchema>;

/** docs/DECISIONS.md: the moderation sees who voted what (the public never does). */
export const juryVoteModerationSchema = z.object({
  pseudo: z.string(),
  verdict: Verdict,
  source: z.string(),
  note: z.string().nullable(),
  votedAt: isoDateTimeSchema,
});
export type JuryVoteModeration = z.infer<typeof juryVoteModerationSchema>;

export const juryModerationSchema = z.object({
  // Jurors still to vote (the moderator decides once none is left).
  pending: z.number().int().nonnegative(),
  votes: z.array(juryVoteModerationSchema),
});
export type JuryModeration = z.infer<typeof juryModerationSchema>;

/** docs/DECISIONS.md: what the public sees of the jury — how many voted and the split. */
export const juryPublicSchema = z.object({
  voters: z.number().int().nonnegative(),
  distribution: z.record(Verdict, z.number().int().nonnegative()),
});
export type JuryPublic = z.infer<typeof juryPublicSchema>;
