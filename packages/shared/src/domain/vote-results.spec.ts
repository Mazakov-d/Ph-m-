import { describe, expect, it } from "vitest";
import { canSeeVoteResults } from "./vote-results.js";

describe("canSeeVoteResults (SPEC §7)", () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ])("hasVoted=%s, revealedResults=%s → %s", (hasVoted, revealedResults, expected) => {
    expect(canSeeVoteResults(hasVoted, revealedResults)).toBe(expected);
  });
});
