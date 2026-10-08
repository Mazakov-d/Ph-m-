import type { EditorReliabilityLevel, Verdict } from "../enums.js";
import {
  EDITOR_RELIABILITY_CORRECTION_FACTOR,
  EDITOR_RELIABILITY_MAX,
  EDITOR_RELIABILITY_MIN_VERDICTS,
  EDITOR_RELIABILITY_OLDEST_WEIGHT,
  EDITOR_RELIABILITY_POINTS,
  EDITOR_RELIABILITY_RELIABLE_MIN,
  EDITOR_RELIABILITY_START,
  EDITOR_RELIABILITY_VERY_RELIABLE_MIN,
  EDITOR_RELIABILITY_WINDOW_MONTHS,
} from "../rules.js";

/** A verdict on one of the editor's articles (the latest one of the article, after appeal). */
export type EditorVerdict = {
  verdict: Verdict;
  decidedAt: Date;
  /** SPEC §5.7: the editor had published a correction of the article before the verdict. */
  correctedBefore: boolean;
};

/** SPEC §5.7: only the verdicts of the last 12 months count. */
export function reliabilityWindowStart(now: Date): Date {
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - EDITOR_RELIABILITY_WINDOW_MONTHS);
  return start;
}

/**
 * SPEC §5.7 + docs/DECISIONS.md: weight decreasing with age, linearly from 1 (today) to 0.25
 * (the start of the window).
 */
export function verdictAgeWeight(decidedAt: Date, now: Date): number {
  const start = reliabilityWindowStart(now);
  const fraction = (now.getTime() - decidedAt.getTime()) / (now.getTime() - start.getTime());
  const clamped = Math.min(1, Math.max(0, fraction));
  return 1 - (1 - EDITOR_RELIABILITY_OLDEST_WEIGHT) * clamped;
}

function verdictsInWindow(verdicts: EditorVerdict[], now: Date): EditorVerdict[] {
  const start = reliabilityWindowStart(now);
  return verdicts.filter((item) => item.decidedAt >= start && item.decidedAt <= now);
}

/**
 * SPEC §5.7: 50 out of 100, plus the points of each verdict of the window weighted by its age;
 * a penalty is halved when a correction came before the verdict. Kept between 0 and 100.
 */
export function editorReliabilityScore(verdicts: EditorVerdict[], now: Date): number {
  const total = verdictsInWindow(verdicts, now).reduce((sum, item) => {
    const points = EDITOR_RELIABILITY_POINTS[item.verdict];
    const corrected = points < 0 && item.correctedBefore ? EDITOR_RELIABILITY_CORRECTION_FACTOR : 1;
    return sum + points * corrected * verdictAgeWeight(item.decidedAt, now);
  }, EDITOR_RELIABILITY_START);
  return Math.min(EDITOR_RELIABILITY_MAX, Math.max(0, total));
}

/** SPEC §5.7: the tier shown to readers (fewer than 3 verdicts: not enough history). */
export function editorReliabilityLevel(
  verdicts: EditorVerdict[],
  now: Date,
): EditorReliabilityLevel {
  if (verdictsInWindow(verdicts, now).length < EDITOR_RELIABILITY_MIN_VERDICTS) {
    return "INSUFFICIENT_HISTORY";
  }
  const score = editorReliabilityScore(verdicts, now);
  if (score >= EDITOR_RELIABILITY_VERY_RELIABLE_MIN) return "VERY_RELIABLE";
  if (score >= EDITOR_RELIABILITY_RELIABLE_MIN) return "RELIABLE";
  return "VIGILANCE";
}
