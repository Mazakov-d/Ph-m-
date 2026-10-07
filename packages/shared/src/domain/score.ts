import { SCORE_EPSILON } from "../rules.js";

/** True if a sum of report weights reaches a threshold, ignoring floating-point noise. */
export function reachesThreshold(score: number, threshold: number): boolean {
  return score >= threshold - SCORE_EPSILON;
}
