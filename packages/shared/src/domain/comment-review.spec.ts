import { describe, expect, it } from "vitest";
import { shouldHideComment } from "./comment-review.js";

describe("shouldHideComment (SPEC §6.2)", () => {
  it("keeps a comment visible below 3", () => {
    expect(shouldHideComment(0)).toBe(false);
    expect(shouldHideComment(2.99)).toBe(false);
  });

  it("hides a comment at exactly 3", () => {
    expect(shouldHideComment(3)).toBe(true);
  });

  it("hides a comment above 3", () => {
    expect(shouldHideComment(3.05)).toBe(true);
  });

  it("hides after 15 new-account reports (15 × 0.2)", () => {
    const totalWeight = Array.from({ length: 15 }, () => 0.2).reduce((sum, w) => sum + w, 0);
    expect(shouldHideComment(totalWeight)).toBe(true);
  });

  it("ignores floating-point noise just under 3", () => {
    expect(shouldHideComment(2.9999999999999996)).toBe(true);
  });

  it("keeps visible after 14 new-account reports", () => {
    expect(shouldHideComment(14 * 0.2)).toBe(false);
  });
});
