/** SPEC §7: totals are only shown after voting or clicking « Voir sans voter ». */
export function canSeeVoteResults(hasVoted: boolean, revealedResults: boolean): boolean {
  return hasVoted || revealedResults;
}
