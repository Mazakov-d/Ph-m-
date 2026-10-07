import { describe, expect, it } from "vitest";
import { computeReportWeight, type Reporter } from "./report-weight.js";
import { MILLISECONDS_PER_DAY } from "./time.js";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function reporter(ageInDays: number, upheld = 0, dismissed = 0): Reporter {
  return {
    createdAt: new Date(NOW.getTime() - ageInDays * MILLISECONDS_PER_DAY),
    upheldReportCount: upheld,
    dismissedReportCount: dismissed,
  };
}

describe("computeReportWeight (SPEC §5.2)", () => {
  it("gives 0.2 to an account created today", () => {
    expect(computeReportWeight(reporter(0), NOW)).toBe(0.2);
  });

  it("gives 0.2 to a 29-day-old account, even with a good history", () => {
    expect(computeReportWeight(reporter(29, 10, 0), NOW)).toBe(0.2);
  });

  it("gives 0.2 one millisecond before the 30 days", () => {
    const account = { ...reporter(30), createdAt: new Date(reporter(30).createdAt.getTime() + 1) };
    expect(computeReportWeight(account, NOW)).toBe(0.2);
  });

  it("is no longer a new account at exactly 30 days", () => {
    expect(computeReportWeight(reporter(30), NOW)).toBe(1.0);
  });

  it("gives 1.0 with no closed report", () => {
    expect(computeReportWeight(reporter(100), NOW)).toBe(1.0);
  });

  it("gives 1.0 with 4 closed reports (below the sample of 5)", () => {
    expect(computeReportWeight(reporter(100, 0, 4), NOW)).toBe(1.0);
  });

  it("uses the ratio from the 5th closed report: all dismissed → 0.1", () => {
    expect(computeReportWeight(reporter(100, 0, 5), NOW)).toBeCloseTo(0.1);
  });

  it("all upheld → 2.0", () => {
    expect(computeReportWeight(reporter(100, 5, 0), NOW)).toBeCloseTo(2.0);
  });

  it("half upheld → 0.1 + 1.9 × 0.5 = 1.05", () => {
    expect(computeReportWeight(reporter(100, 5, 5), NOW)).toBeCloseTo(1.05);
  });

  it("3 upheld out of 5 → 0.1 + 1.9 × 0.6 = 1.24", () => {
    expect(computeReportWeight(reporter(100, 3, 2), NOW)).toBeCloseTo(1.24);
  });
});
