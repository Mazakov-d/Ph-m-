import { z } from "zod";
import { VOTE_OPTION_LABEL_MAX_LENGTH } from "../rules.js";
import { idSchema } from "./common.js";

// SPEC §7: an answer choice written by the editor of an opinion.
export const voteOptionLabelSchema = z.string().trim().min(1).max(VOTE_OPTION_LABEL_MAX_LENGTH);

// SPEC §7: one vote per account and opinion (one of its choices), which can be changed.
export const castVoteInputSchema = z.object({
  optionId: idSchema,
});
export type CastVoteInput = z.infer<typeof castVoteInputSchema>;

export const voteOptionPublicSchema = z.object({
  id: idSchema,
  label: z.string(),
});
export type VoteOptionPublic = z.infer<typeof voteOptionPublicSchema>;

/**
 * SPEC §7: the choices are always sent (to vote), but `results` is null until the reader has
 * voted or clicked « Voir sans voter » (see canSeeVoteResults).
 */
export const voteSummaryPublicSchema = z.object({
  options: z.array(voteOptionPublicSchema),
  myOptionId: idSchema.nullable(),
  revealedResults: z.boolean(),
  results: z
    .object({
      totalVotes: z.number().int().nonnegative(),
      counts: z.array(z.object({ optionId: idSchema, count: z.number().int().nonnegative() })),
    })
    .nullable(),
});
export type VoteSummaryPublic = z.infer<typeof voteSummaryPublicSchema>;
