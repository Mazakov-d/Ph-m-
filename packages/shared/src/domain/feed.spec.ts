import { describe, expect, it } from "vitest";
import { feedWindowStart } from "./feed.js";

const NOW = new Date("2026-10-08T09:00:00.000Z");

describe("feedWindowStart", () => {
  it("starts 48 hours ago for the feed (SPEC §4.1)", () => {
    expect(feedWindowStart(NOW, false)).toEqual(new Date("2026-10-06T09:00:00.000Z"));
  });

  it("starts 24 hours ago with the today filter, not at midnight (SPEC §4.3)", () => {
    expect(feedWindowStart(NOW, true)).toEqual(new Date("2026-10-07T09:00:00.000Z"));
  });
});
