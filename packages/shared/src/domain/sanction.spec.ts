import { describe, expect, it } from "vitest";
import { nextSanction } from "./sanction.js";

describe("nextSanction (SPEC §6.3)", () => {
  it("escalates over 4 removed comments: warning, 24 h, 7 days, ban", () => {
    expect([1, 2, 3, 4].map((count) => nextSanction(count, false))).toEqual([
      "WARNING",
      "SUSPENSION_24H",
      "SUSPENSION_7D",
      "PERMANENT_BAN",
    ]);
  });

  it("stays at a permanent ban beyond the 4th", () => {
    expect(nextSanction(5, false)).toBe("PERMANENT_BAN");
    expect(nextSanction(12, false)).toBe("PERMANENT_BAN");
  });

  it("bans directly for a confirmed discrimination, even on a first offence", () => {
    expect(nextSanction(1, true)).toBe("PERMANENT_BAN");
  });

  it("rejects a count that does not include the removed comment", () => {
    expect(() => nextSanction(0, false)).toThrow(RangeError);
    expect(() => nextSanction(-1, false)).toThrow(RangeError);
    expect(() => nextSanction(1.5, false)).toThrow(RangeError);
  });
});
