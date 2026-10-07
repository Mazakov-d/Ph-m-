import { COMMENT_REPORT_THRESHOLD } from "../rules.js";
import { reachesThreshold } from "./score.js";

/** SPEC §6.2: a comment goes UNDER_REVIEW (hidden) once its report weights reach the threshold. */
export function shouldHideComment(totalWeight: number): boolean {
  return reachesThreshold(totalWeight, COMMENT_REPORT_THRESHOLD);
}
