import { describe, expect, it } from "vitest";
import type { Verdict } from "../enums.js";
import {
  type EditorVerdict,
  editorReliabilityLevel,
  editorReliabilityScore,
  reliabilityWindowStart,
  verdictAgeWeight,
} from "./editor-reliability.js";

const NOW = new Date("2026-10-08T12:00:00Z");
const DAY = 86_400_000;
const today = (verdict: Verdict, correctedBefore = false): EditorVerdict => ({
  verdict,
  decidedAt: NOW,
  correctedBefore,
});

describe("verdictAgeWeight (SPEC §5.7: linear 1 → 0.25 over 12 months)", () => {
  it("is 1 today and 0.25 at the start of the window", () => {
    expect(verdictAgeWeight(NOW, NOW)).toBe(1);
    expect(verdictAgeWeight(reliabilityWindowStart(NOW), NOW)).toBe(0.25);
  });

  it("is in between halfway", () => {
    const start = reliabilityWindowStart(NOW);
    const halfway = new Date((NOW.getTime() + start.getTime()) / 2);
    expect(verdictAgeWeight(halfway, NOW)).toBeCloseTo(0.625);
  });
});

describe("editorReliabilityScore", () => {
  it("starts at 50 and adds the points of each verdict", () => {
    expect(editorReliabilityScore([], NOW)).toBe(50);
    expect(
      editorReliabilityScore([today("ACCURATE"), today("MISSING_CONTEXT"), today("FALSE")], NOW),
    ).toBe(41);
  });

  it("gives no point for an unverifiable article", () => {
    expect(editorReliabilityScore([today("UNVERIFIABLE")], NOW)).toBe(50);
  });

  it("halves a penalty when a correction came before the verdict, never a bonus", () => {
    expect(editorReliabilityScore([today("FALSE", true)], NOW)).toBe(45);
    expect(editorReliabilityScore([today("ACCURATE", true)], NOW)).toBe(52);
  });

  it("counts a verdict of exactly 12 months, not one of 12 months and a day", () => {
    const start = reliabilityWindowStart(NOW);
    const atStart = { verdict: "FALSE" as const, decidedAt: start, correctedBefore: false };
    const before = { ...atStart, decidedAt: new Date(start.getTime() - DAY) };
    expect(editorReliabilityScore([atStart], NOW)).toBe(47.5);
    expect(editorReliabilityScore([before], NOW)).toBe(50);
  });

  it("stays between 0 and 100", () => {
    expect(
      editorReliabilityScore(
        Array.from({ length: 6 }, () => today("FALSE")),
        NOW,
      ),
    ).toBe(0);
    expect(
      editorReliabilityScore(
        Array.from({ length: 30 }, () => today("ACCURATE")),
        NOW,
      ),
    ).toBe(100);
  });
});

describe("editorReliabilityLevel (SPEC §5.7: ≥ 60, ≥ 45, otherwise)", () => {
  it("needs 3 verdicts of the window", () => {
    expect(editorReliabilityLevel([today("ACCURATE"), today("ACCURATE")], NOW)).toBe(
      "INSUFFICIENT_HISTORY",
    );
  });

  it("is very reliable at exactly 60, reliable at 58", () => {
    expect(
      editorReliabilityLevel(
        Array.from({ length: 5 }, () => today("ACCURATE")),
        NOW,
      ),
    ).toBe("VERY_RELIABLE");
    expect(
      editorReliabilityLevel(
        Array.from({ length: 4 }, () => today("ACCURATE")),
        NOW,
      ),
    ).toBe("RELIABLE");
  });

  it("is reliable at exactly 45, vigilance at 44", () => {
    expect(
      editorReliabilityLevel(
        [today("MISLEADING"), today("UNVERIFIABLE"), today("UNVERIFIABLE")],
        NOW,
      ),
    ).toBe("RELIABLE");
    expect(
      editorReliabilityLevel(
        [today("MISLEADING"), today("MISSING_CONTEXT"), today("UNVERIFIABLE")],
        NOW,
      ),
    ).toBe("VIGILANCE");
  });
});
