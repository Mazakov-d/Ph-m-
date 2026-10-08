import { describe, expect, it } from "vitest";
import {
  type FeedCandidate,
  feedWeights,
  freshnessFactor,
  reliabilityFactor,
  seededRandom,
  spaceEditors,
  weightedDraw,
  weightedFeedOrder,
} from "./weighted-feed.js";

const NOW = new Date("2026-10-08T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function candidate(id: string, overrides: Partial<FeedCandidate> = {}): FeedCandidate {
  return {
    id,
    editorId: `editor-${id}`,
    createdAt: NOW,
    kind: "ARTICLE",
    reviewStatus: "NOT_REVIEWED",
    verdict: null,
    ...overrides,
  };
}

describe("freshnessFactor (SPEC §4.2, half-life 12 h)", () => {
  it("is 1 when published, 0.5 at 12 h, 0.25 at 24 h", () => {
    expect(freshnessFactor(0)).toBe(1);
    expect(freshnessFactor(12)).toBe(0.5);
    expect(freshnessFactor(24)).toBe(0.25);
  });

  it("treats a date slightly in the future as fresh", () => {
    expect(freshnessFactor(-1)).toBe(1);
  });
});

describe("reliabilityFactor (SPEC §4.2)", () => {
  it.each([
    ["NOT_REVIEWED", null, 1],
    ["UNDER_REVIEW", null, 0.5],
    ["REVIEWED", "ACCURATE", 1.2],
    ["REVIEWED", "MISSING_CONTEXT", 0.7],
    ["REVIEWED", "UNVERIFIABLE", 0.6],
    ["REVIEWED", "MISLEADING", 0.3],
    ["REVIEWED", "FALSE", 0.1],
  ] as const)("%s %s → %s", (reviewStatus, verdict, factor) => {
    expect(reliabilityFactor({ kind: "ARTICLE", reviewStatus, verdict })).toBe(factor);
  });

  it("is neutral for an opinion, even under review", () => {
    expect(
      reliabilityFactor({ kind: "OPINION", reviewStatus: "UNDER_REVIEW", verdict: null }),
    ).toBe(1);
  });
});

describe("feedWeights", () => {
  it("multiplies freshness and reliability", () => {
    const weights = feedWeights(
      [candidate("a", { createdAt: hoursAgo(12), reviewStatus: "REVIEWED", verdict: "FALSE" })],
      NOW,
    );
    expect(weights.get("a")).toBeCloseTo(0.05);
  });

  it("divides by the square root of the editor's number of posts", () => {
    const four = ["a", "b", "c", "d"].map((id) => candidate(id, { editorId: "prolific" }));
    const weights = feedWeights([...four, candidate("e")], NOW);
    expect(weights.get("a")).toBe(0.5);
    expect(weights.get("e")).toBe(1);
  });
});

describe("seededRandom", () => {
  it("gives the same numbers for the same seed, others for another seed", () => {
    const first = seededRandom("abc");
    const again = seededRandom("abc");
    const other = seededRandom("abd");
    const draws = [first(), first(), first()];
    expect([again(), again(), again()]).toEqual(draws);
    expect(other()).not.toBe(draws[0]);
    expect(draws.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("weightedDraw", () => {
  it("puts a post nine times heavier first about nine times out of ten", () => {
    const items = [
      { id: "heavy", weight: 9 },
      { id: "light", weight: 1 },
    ];
    const DRAWS = 2000;
    let heavyFirst = 0;
    for (let draw = 0; draw < DRAWS; draw++) {
      if (weightedDraw(items, seededRandom(`seed-${draw}`))[0] === "heavy") heavyFirst++;
    }
    expect(heavyFirst / DRAWS).toBeGreaterThan(0.86);
    expect(heavyFirst / DRAWS).toBeLessThan(0.94);
  });

  it("keeps every post exactly once", () => {
    const ids = weightedDraw(
      ["a", "b", "c"].map((id) => ({ id, weight: 1 })),
      seededRandom("x"),
    );
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("spaceEditors (SPEC §4.2: FEED_SPACING = 4)", () => {
  const post = (id: string, editorId: string) => ({ id, editorId });

  it("never shows an editor twice in four consecutive posts when it can be avoided", () => {
    const spaced = spaceEditors([
      post("a1", "A"),
      post("a2", "A"),
      post("b", "B"),
      post("c", "C"),
      post("d", "D"),
    ]);
    expect(spaced.map((item) => item.id)).toEqual(["a1", "b", "c", "d", "a2"]);
  });

  it("allows the editor again exactly at the fourth next place", () => {
    const spaced = spaceEditors([post("a1", "A"), post("b", "B"), post("c", "C"), post("a2", "A")]);
    expect(spaced.map((item) => item.id)).toEqual(["a1", "b", "c", "a2"]);
  });

  it("places an editor early when its posts would no longer fit later", () => {
    const spaced = spaceEditors([
      post("b", "B"),
      post("a1", "A"),
      post("c", "C"),
      post("a2", "A"),
      post("d", "D"),
    ]);
    expect(spaced.map((item) => item.id)).toEqual(["a1", "b", "c", "d", "a2"]);
  });

  it("keeps the drawn order when a single editor is left", () => {
    expect(spaceEditors([post("a1", "A"), post("a2", "A")]).map((item) => item.id)).toEqual([
      "a1",
      "a2",
    ]);
  });
});

describe("weightedFeedOrder", () => {
  it("is the same for the same seed and keeps every post", () => {
    const candidates = ["a", "b", "c", "d", "e"].map((id, index) =>
      candidate(id, { createdAt: hoursAgo(index * 5) }),
    );
    const order = weightedFeedOrder(candidates, NOW, "session-1");
    expect(weightedFeedOrder(candidates, NOW, "session-1")).toEqual(order);
    expect([...order].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });
});
