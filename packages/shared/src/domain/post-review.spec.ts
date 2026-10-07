import { describe, expect, it } from "vitest";
import { computePostReviewThreshold, shouldOpenPostReview } from "./post-review.js";

describe("computePostReviewThreshold (SPEC §5.3)", () => {
  it("is 5 for a post nobody has read", () => {
    expect(computePostReviewThreshold(0)).toBe(5);
  });

  it("stays at 5 up to 500 readers (1 % of 500 = 5)", () => {
    expect(computePostReviewThreshold(499)).toBe(5);
    expect(computePostReviewThreshold(500)).toBe(5);
  });

  it("follows 1 % of the readers above 500", () => {
    expect(computePostReviewThreshold(501)).toBeCloseTo(5.01);
    expect(computePostReviewThreshold(10_000)).toBe(100);
  });
});

describe("shouldOpenPostReview (SPEC §5.3)", () => {
  it("does not open below the threshold", () => {
    expect(shouldOpenPostReview(4.99, 100)).toBe(false);
  });

  it("opens when the score equals the threshold", () => {
    expect(shouldOpenPostReview(5, 100)).toBe(true);
  });

  it("opens above the threshold", () => {
    expect(shouldOpenPostReview(5.2, 100)).toBe(true);
  });

  it("5 reports from new accounts (0.2 each) do not open a review", () => {
    expect(shouldOpenPostReview(0.2 + 0.2 + 0.2 + 0.2 + 0.2, 10)).toBe(false);
  });

  it("5 reports from regular readers (1.0 each) open a review on a little-read post", () => {
    expect(shouldOpenPostReview(5 * 1.0, 10)).toBe(true);
  });

  it("uses the audience threshold on a widely read post", () => {
    expect(shouldOpenPostReview(99, 10_000)).toBe(false);
    expect(shouldOpenPostReview(100, 10_000)).toBe(true);
  });

  it("counts 25 new-account reports as reaching 5 despite floating-point sums", () => {
    const score = Array.from({ length: 25 }, () => 0.2).reduce((sum, weight) => sum + weight, 0);
    expect(shouldOpenPostReview(score, 10)).toBe(true);
  });
});
