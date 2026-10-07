import { REVIEW_PRIORITY_VIEW_OFFSET } from "../rules.js";

/** SPEC §5.4: the review queue is sorted by this value, highest first. */
export function computeReviewPriority(score: number, viewCount: number): number {
  return score * Math.log10(viewCount + REVIEW_PRIORITY_VIEW_OFFSET);
}
