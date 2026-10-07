import { z } from "zod";
import { VoteValue } from "../enums.js";

// SPEC §7: one vote per account and opinion, which can be changed.
export const castVoteInputSchema = z.object({
  value: VoteValue,
});
export type CastVoteInput = z.infer<typeof castVoteInputSchema>;

/**
 * SPEC §7: `results` is null until the reader has voted or clicked « Voir sans voter »
 * (see canSeeVoteResults).
 */
export const voteSummaryPublicSchema = z.object({
  myVote: VoteValue.nullable(),
  revealedResults: z.boolean(),
  results: z
    .object({
      agreeCount: z.number().int().nonnegative(),
      disagreeCount: z.number().int().nonnegative(),
    })
    .nullable(),
});
export type VoteSummaryPublic = z.infer<typeof voteSummaryPublicSchema>;
