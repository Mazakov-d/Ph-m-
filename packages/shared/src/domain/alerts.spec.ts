import { describe, expect, it } from "vitest";
import { alertMatchesPost } from "./alerts.js";

const SPORT_FRANCE = { theme: "SPORT", zone: "FRANCE", locality: null } as const;

describe("alertMatchesPost (push notifications)", () => {
  it("matches a post with the theme and the zone of the alert", () => {
    expect(alertMatchesPost(SPORT_FRANCE, { theme: "SPORT", zone: "FRANCE", locality: null })).toBe(
      true,
    );
  });

  it("needs every criterion it sets", () => {
    expect(alertMatchesPost(SPORT_FRANCE, { theme: "SPORT", zone: "EUROPE", locality: null })).toBe(
      false,
    );
    expect(
      alertMatchesPost(SPORT_FRANCE, { theme: "POLITICS", zone: "FRANCE", locality: null }),
    ).toBe(false);
  });

  it("matches every place when only a theme is set", () => {
    const politics = { theme: "POLITICS", zone: null, locality: null } as const;
    expect(
      alertMatchesPost(politics, { theme: "POLITICS", zone: "LOCAL", locality: "RENNES" }),
    ).toBe(true);
  });

  it("matches the cities of a region, never another region", () => {
    const brittany = { theme: null, zone: "LOCAL", locality: "BRETAGNE" } as const;
    expect(alertMatchesPost(brittany, { theme: "SPORT", zone: "LOCAL", locality: "RENNES" })).toBe(
      true,
    );
    expect(alertMatchesPost(brittany, { theme: "SPORT", zone: "LOCAL", locality: "NANTES" })).toBe(
      false,
    );
  });

  it("matches only its city for an alert on a city", () => {
    const rennes = { theme: null, zone: "LOCAL", locality: "RENNES" } as const;
    expect(alertMatchesPost(rennes, { theme: "SPORT", zone: "LOCAL", locality: "BRETAGNE" })).toBe(
      false,
    );
  });
});
