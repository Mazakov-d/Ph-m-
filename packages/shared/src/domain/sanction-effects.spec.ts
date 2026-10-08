import { describe, expect, it } from "vitest";
import { sanctionCountingStart, suspensionEndsAt } from "./sanction-effects.js";

const NOW = new Date("2026-10-08T12:00:00.000Z");

describe("suspensionEndsAt (SPEC §6.3)", () => {
  it("suspends for 24 hours", () => {
    expect(suspensionEndsAt("SUSPENSION_24H", NOW)).toEqual(new Date("2026-10-09T12:00:00.000Z"));
  });

  it("suspends for 7 days", () => {
    expect(suspensionEndsAt("SUSPENSION_7D", NOW)).toEqual(new Date("2026-10-15T12:00:00.000Z"));
  });

  it("has no end for a warning or a ban", () => {
    expect(suspensionEndsAt("WARNING", NOW)).toBeNull();
    expect(suspensionEndsAt("PERMANENT_BAN", NOW)).toBeNull();
  });
});

describe("sanctionCountingStart (SPEC §6.3)", () => {
  it("counts the last 6 months", () => {
    expect(sanctionCountingStart(NOW)).toEqual(new Date("2026-04-08T12:00:00.000Z"));
  });
});
