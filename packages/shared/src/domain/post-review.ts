import { POST_REPORT_AUDIENCE_RATIO, POST_REPORT_MIN_SCORE } from "../rules.js";
import { reachesThreshold } from "./score.js";

/** SPEC §5.3: threshold = max(5, 1 % of the unique readers). */
export function computePostReviewThreshold(viewCount: number): number {
  return Math.max(POST_REPORT_MIN_SCORE, POST_REPORT_AUDIENCE_RATIO * viewCount);
}

/**
 * SPEC §5.3: `score` is the sum of the weights of the PENDING reports of the post.
 * The caller only applies the result to a post whose reviewStatus is NOT_REVIEWED.
 */
export function shouldOpenPostReview(score: number, viewCount: number): boolean {
  return reachesThreshold(score, computePostReviewThreshold(viewCount));
}
