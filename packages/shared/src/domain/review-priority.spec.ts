import { describe, expect, it } from "vitest";
import { computeReviewPriority } from "./review-priority.js";

describe("computeReviewPriority (SPEC §5.4)", () => {
  it("equals the score for a post nobody has read (log10(10) = 1)", () => {
    expect(computeReviewPriority(5, 0)).toBe(5);
  });

  it("is zero without reports", () => {
    expect(computeReviewPriority(0, 1_000)).toBe(0);
  });

  it("grows with the audience: score × log10(views + 10)", () => {
    expect(computeReviewPriority(5, 90)).toBeCloseTo(10);
    expect(computeReviewPriority(5, 990)).toBeCloseTo(15);
  });

  it("ranks a widely read post above a little-read one with the same score", () => {
    expect(computeReviewPriority(6, 10_000)).toBeGreaterThan(computeReviewPriority(6, 50));
  });
});
