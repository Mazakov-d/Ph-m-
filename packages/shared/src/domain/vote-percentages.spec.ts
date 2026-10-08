import { describe, expect, it } from "vitest";
import { computeVotePercentages } from "./vote-percentages.js";

describe("computeVotePercentages", () => {
  it("gives zeros when nobody voted", () => {
    expect(computeVotePercentages([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("computes exact shares", () => {
    expect(computeVotePercentages([1, 1])).toEqual([50, 50]);
    expect(computeVotePercentages([3, 1])).toEqual([75, 25]);
  });

  it("always adds up to 100 (thirds: 34 + 33 + 33)", () => {
    const thirds = computeVotePercentages([1, 1, 1]);
    expect(thirds).toEqual([34, 33, 33]);
    expect(thirds.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives the missing points to the largest remainders", () => {
    // 28.57, 28.57, 42.86 → 28, 28, 42 (= 98): +1 to .86 (third), then to the first .57
    expect(computeVotePercentages([2, 2, 3])).toEqual([29, 28, 43]);
  });

  it("handles a choice with no vote", () => {
    expect(computeVotePercentages([79, 40, 9, 0])).toEqual([62, 31, 7, 0]);
  });
});
