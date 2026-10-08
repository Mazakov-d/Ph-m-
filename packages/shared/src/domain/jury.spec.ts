import { describe, expect, it } from "vitest";
import {
  drawJurors,
  isJuryEligible,
  type JuryCandidate,
  juryDeadline,
  juryDistribution,
  juryMajority,
  needsJuryJustification,
} from "./jury.js";
import { seededRandom } from "./weighted-feed.js";

const NOW = new Date("2026-10-08T12:00:00Z");
const monthsAgo = (months: number) => {
  const date = new Date(NOW);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
};
const volunteer = (overrides: Partial<JuryCandidate> = {}): JuryCandidate => ({
  role: "READER",
  hasEditorProfile: false,
  juryVolunteer: true,
  createdAt: monthsAgo(7),
  lastSanctionAt: null,
  hasPendingJury: false,
  restricted: false,
  ...overrides,
});

describe("isJuryEligible (SPEC §5.8)", () => {
  it("accepts a volunteer reader registered for 6 months exactly", () => {
    expect(isJuryEligible(volunteer(), NOW)).toBe(true);
    expect(isJuryEligible(volunteer({ createdAt: monthsAgo(6) }), NOW)).toBe(true);
  });

  it("refuses an account a day short of 6 months", () => {
    const short = new Date(monthsAgo(6).getTime() + 86_400_000);
    expect(isJuryEligible(volunteer({ createdAt: short }), NOW)).toBe(false);
  });

  it("refuses a non-volunteer, an editor, an applicant, the moderation", () => {
    expect(isJuryEligible(volunteer({ juryVolunteer: false }), NOW)).toBe(false);
    expect(isJuryEligible(volunteer({ role: "EDITOR" }), NOW)).toBe(false);
    expect(isJuryEligible(volunteer({ hasEditorProfile: true }), NOW)).toBe(false);
    expect(isJuryEligible(volunteer({ role: "MODERATOR" }), NOW)).toBe(false);
  });

  it("refuses a sanction of the last 12 months, accepts an older one", () => {
    expect(isJuryEligible(volunteer({ lastSanctionAt: monthsAgo(11) }), NOW)).toBe(false);
    expect(isJuryEligible(volunteer({ lastSanctionAt: monthsAgo(13) }), NOW)).toBe(true);
  });

  it("refuses a restricted account and a juror already on a jury", () => {
    expect(isJuryEligible(volunteer({ restricted: true }), NOW)).toBe(false);
    expect(isJuryEligible(volunteer({ hasPendingJury: true }), NOW)).toBe(false);
  });
});

describe("drawJurors", () => {
  const ids = Array.from({ length: 20 }, (_, index) => `reader-${index}`);

  it("draws distinct candidates, the same for the same random numbers", () => {
    const jury = drawJurors(ids, 7, seededRandom("x"));
    expect(new Set(jury).size).toBe(7);
    expect(drawJurors(ids, 7, seededRandom("x"))).toEqual(jury);
  });

  it("takes everyone when there are fewer candidates than seats", () => {
    expect([...drawJurors(["a", "b"], 7, seededRandom("x"))].sort()).toEqual(["a", "b"]);
  });

  it("gives every candidate the same chance", () => {
    const DRAWS = 3000;
    const counts = new Map<string, number>();
    for (let draw = 0; draw < DRAWS; draw++) {
      for (const id of drawJurors(["a", "b", "c", "d"], 1, seededRandom(`d${draw}`))) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const id of ["a", "b", "c", "d"]) {
      expect((counts.get(id) ?? 0) / DRAWS).toBeGreaterThan(0.21);
      expect((counts.get(id) ?? 0) / DRAWS).toBeLessThan(0.29);
    }
  });
});

describe("juryDeadline", () => {
  it("is 48 hours after the draw", () => {
    expect(juryDeadline(NOW).toISOString()).toBe("2026-10-10T12:00:00.000Z");
  });
});

describe("juryMajority and juryDistribution", () => {
  it("counts the verdicts", () => {
    expect(juryDistribution(["FALSE", "FALSE", "ACCURATE"])).toEqual({
      ACCURATE: 1,
      MISSING_CONTEXT: 0,
      MISLEADING: 0,
      FALSE: 2,
      UNVERIFIABLE: 0,
    });
  });

  it("finds the verdict chosen most often, none on a tie or without votes", () => {
    expect(juryMajority(["FALSE", "FALSE", "ACCURATE"])).toBe("FALSE");
    expect(juryMajority(["FALSE", "ACCURATE"])).toBeNull();
    expect(juryMajority([])).toBeNull();
  });
});

describe("needsJuryJustification", () => {
  it("asks the moderator to explain a verdict other than the majority's", () => {
    expect(needsJuryJustification("ACCURATE", ["FALSE", "FALSE", "ACCURATE"])).toBe(true);
    expect(needsJuryJustification("FALSE", ["FALSE", "FALSE", "ACCURATE"])).toBe(false);
    expect(needsJuryJustification("ACCURATE", ["FALSE", "ACCURATE"])).toBe(false);
  });
});
