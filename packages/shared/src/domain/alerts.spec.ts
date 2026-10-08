import { describe, expect, it } from "vitest";
import { alertMatchesPost } from "./alerts.js";

const SPORT_FRANCE = { theme: "SPORT", zone: "FRANCE", region: null } as const;

describe("alertMatchesPost (push notifications)", () => {
  it("matches a post with the theme and the zone of the alert", () => {
    expect(alertMatchesPost(SPORT_FRANCE, { theme: "SPORT", zone: "FRANCE", region: null })).toBe(
      true,
    );
  });

  it("needs every criterion it sets", () => {
    expect(alertMatchesPost(SPORT_FRANCE, { theme: "SPORT", zone: "EUROPE", region: null })).toBe(
      false,
    );
    expect(
      alertMatchesPost(SPORT_FRANCE, { theme: "POLITICS", zone: "FRANCE", region: null }),
    ).toBe(false);
  });

  it("matches every zone when only a theme is set", () => {
    const politics = { theme: "POLITICS", zone: null, region: null } as const;
    expect(
      alertMatchesPost(politics, { theme: "POLITICS", zone: "LOCAL", region: "Bretagne" }),
    ).toBe(true);
  });

  it("narrows a local alert to its region, ignoring case", () => {
    const brittany = { theme: null, zone: "LOCAL", region: "bretagne" } as const;
    expect(alertMatchesPost(brittany, { theme: "SPORT", zone: "LOCAL", region: "Bretagne" })).toBe(
      true,
    );
    expect(alertMatchesPost(brittany, { theme: "SPORT", zone: "LOCAL", region: "Normandie" })).toBe(
      false,
    );
  });
});
