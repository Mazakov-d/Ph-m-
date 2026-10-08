import type { UserRole, Verdict } from "../enums.js";
import { Verdict as VerdictEnum } from "../enums.js";
import { JURY_MIN_ACCOUNT_MONTHS, JURY_SANCTION_FREE_MONTHS, JURY_VOTE_HOURS } from "../rules.js";
import { MILLISECONDS_PER_HOUR } from "./time.js";

/** What decides whether a reader can be drawn for a jury (SPEC §5.8). */
export type JuryCandidate = {
  role: UserRole;
  hasEditorProfile: boolean;
  juryVolunteer: boolean;
  createdAt: Date;
  lastSanctionAt: Date | null;
  hasPendingJury: boolean;
  restricted: boolean;
};

function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

/**
 * SPEC §5.8 + docs/DECISIONS.md: a volunteer reader (never an editor, an applicant nor the
 * moderation: no link to a media), registered for 6 months, without any sanction over 12 months,
 * neither suspended nor banned, and not already on a jury.
 */
export function isJuryEligible(candidate: JuryCandidate, now: Date): boolean {
  return (
    candidate.juryVolunteer &&
    candidate.role === "READER" &&
    !candidate.hasEditorProfile &&
    !candidate.restricted &&
    !candidate.hasPendingJury &&
    candidate.createdAt <= monthsBefore(now, JURY_MIN_ACCOUNT_MONTHS) &&
    (candidate.lastSanctionAt === null ||
      candidate.lastSanctionAt < monthsBefore(now, JURY_SANCTION_FREE_MONTHS))
  );
}

/** SPEC §5.8: `count` jurors drawn at random among the eligible ones (all of them if fewer). */
export function drawJurors(candidateIds: string[], count: number, random: () => number): string[] {
  const pool = [...candidateIds];
  // Partial Fisher-Yates shuffle: each candidate has the same chance.
  for (let index = 0; index < Math.min(count, pool.length); index++) {
    const chosen = index + Math.floor(random() * (pool.length - index));
    const current = pool[index];
    const picked = pool[chosen];
    if (current !== undefined && picked !== undefined) {
      pool[index] = picked;
      pool[chosen] = current;
    }
  }
  return pool.slice(0, count);
}

/** docs/DECISIONS.md: a juror votes within JURY_VOTE_HOURS of being drawn. */
export function juryDeadline(drawnAt: Date): Date {
  return new Date(drawnAt.getTime() + JURY_VOTE_HOURS * MILLISECONDS_PER_HOUR);
}

/** How many jurors chose each verdict. */
export function juryDistribution(verdicts: Verdict[]): Record<Verdict, number> {
  const distribution = Object.fromEntries(VerdictEnum.options.map((verdict) => [verdict, 0]));
  for (const verdict of verdicts) distribution[verdict] = (distribution[verdict] ?? 0) + 1;
  return {
    ACCURATE: distribution.ACCURATE ?? 0,
    MISSING_CONTEXT: distribution.MISSING_CONTEXT ?? 0,
    MISLEADING: distribution.MISLEADING ?? 0,
    FALSE: distribution.FALSE ?? 0,
    UNVERIFIABLE: distribution.UNVERIFIABLE ?? 0,
  };
}

/** The verdict chosen by more jurors than any other, or null (no vote, or a tie). */
export function juryMajority(verdicts: Verdict[]): Verdict | null {
  const counts = Object.entries(juryDistribution(verdicts))
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const [first, second] = counts;
  if (!first || (second && second[1] === first[1])) return null;
  return VerdictEnum.parse(first[0]);
}

/**
 * docs/DECISIONS.md: the moderator gives the final verdict and explains it publicly when it
 * departs from the majority of the jury.
 */
export function needsJuryJustification(verdict: Verdict, juryVerdicts: Verdict[]): boolean {
  const majority = juryMajority(juryVerdicts);
  return majority !== null && majority !== verdict;
}
