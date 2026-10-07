import type { SanctionType } from "../enums.js";

// SPEC §6.3: the n-th REMOVED comment over SANCTION_RESET_MONTHS gives the n-th sanction.
const SANCTION_LADDER: readonly SanctionType[] = [
  "WARNING",
  "SUSPENSION_24H",
  "SUSPENSION_7D",
  "PERMANENT_BAN",
];

/**
 * SPEC §6.3: sanction for a comment that has just been REMOVED.
 * `removedCountLast6Months` includes that comment: 1 for a first offence.
 * A confirmed discrimination gives a permanent ban directly.
 */
export function nextSanction(
  removedCountLast6Months: number,
  isDiscrimination: boolean,
): SanctionType {
  if (!Number.isInteger(removedCountLast6Months) || removedCountLast6Months < 1) {
    throw new RangeError("removedCountLast6Months must include the removed comment (≥ 1)");
  }
  if (isDiscrimination) {
    return "PERMANENT_BAN";
  }
  const index = Math.min(removedCountLast6Months, SANCTION_LADDER.length) - 1;
  return SANCTION_LADDER[index] ?? "PERMANENT_BAN";
}
