import { describe, expect, it } from "vitest";
import {
  CITIES,
  isLocality,
  LOCALITIES,
  localitiesWithin,
  placeToZone,
  REGIONS,
  zoneToPlace,
} from "./localities.js";

describe("localities (docs/DECISIONS.md: places)", () => {
  it("lists the 18 regions and 20 cities, each city in a region", () => {
    expect(REGIONS).toHaveLength(18);
    expect(CITIES).toHaveLength(20);
    for (const city of CITIES) {
      const info = LOCALITIES[city];
      expect(info.kind === "CITY" && REGIONS.includes(info.region)).toBe(true);
    }
  });

  it("covers a region and its cities, or the city alone", () => {
    expect(localitiesWithin("BRETAGNE")).toEqual(["BRETAGNE", "RENNES"]);
    expect(localitiesWithin("CORSE")).toEqual(["CORSE"]);
    expect(localitiesWithin("LYON")).toEqual(["LYON"]);
  });

  it("turns a place into a zone and a locality, and back", () => {
    expect(placeToZone("EUROPE")).toEqual({ zone: "EUROPE", locality: null });
    expect(placeToZone("NANTES")).toEqual({ zone: "LOCAL", locality: "NANTES" });
    expect(zoneToPlace("LOCAL", "NANTES")).toBe("NANTES");
    expect(zoneToPlace("FRANCE", null)).toBe("FRANCE");
    expect(isLocality("FRANCE")).toBe(false);
  });
});
