import { describe, expect, it } from "vitest";
import { diversifySimilar, otherMediaCount, type SimilarCandidate } from "./similar-posts.js";

const post = (
  id: string,
  editorId: string,
  ownerGroup: string | null,
  certified: boolean,
): SimilarCandidate => ({ id, editorId, ownerGroup, certified });

describe("otherMediaCount (SPEC §9)", () => {
  it("counts each editor once", () => {
    expect(
      otherMediaCount([
        post("a", "E1", null, true),
        post("b", "E1", null, true),
        post("c", "E2", null, false),
      ]),
    ).toBe(2);
  });
});

describe("diversifySimilar (SPEC §9)", () => {
  it("keeps one post per owner group, the most relevant", () => {
    const result = diversifySimilar([
      post("a", "E1", "Groupe A", true),
      post("b", "E2", "Groupe A", true),
      post("c", "E3", "Groupe B", true),
    ]);
    expect(result.map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("treats an editor without a group as its own group", () => {
    const result = diversifySimilar([
      post("a", "E1", null, false),
      post("b", "E1", null, false),
      post("c", "E2", null, false),
    ]);
    expect(result.map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("alternates certified and independent editors, starting with the most relevant", () => {
    const result = diversifySimilar([
      post("i1", "E1", null, false),
      post("c1", "E2", null, true),
      post("c2", "E3", null, true),
      post("i2", "E4", null, false),
    ]);
    expect(result.map((item) => item.id)).toEqual(["i1", "c1", "i2", "c2"]);
  });

  it("fills with the other kind when one runs out, up to the maximum", () => {
    const certifiedOnly = ["a", "b", "c", "d", "e", "f"].map((id) =>
      post(id, `E-${id}`, null, true),
    );
    expect(diversifySimilar(certifiedOnly).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("returns nothing without candidates", () => {
    expect(diversifySimilar([])).toEqual([]);
  });
});
