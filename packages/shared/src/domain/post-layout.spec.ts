import { describe, expect, it } from "vitest";
import { bodyExcerpt, feedCardThirdBlock } from "./post-layout.js";

describe("feedCardThirdBlock (docs/DECISIONS.md, interface brief)", () => {
  it("shows the pictures of a MEDIA_FIRST post", () => {
    expect(feedCardThirdBlock("MEDIA_FIRST", true)).toBe("MEDIA");
  });

  it("shows the article of a TEXT_FIRST post, even with pictures", () => {
    expect(feedCardThirdBlock("TEXT_FIRST", true)).toBe("BODY");
  });

  it("shows the article of a MEDIA_FIRST post without pictures", () => {
    expect(feedCardThirdBlock("MEDIA_FIRST", false)).toBe("BODY");
  });
});

describe("bodyExcerpt", () => {
  it("keeps a text exactly at the limit", () => {
    expect(bodyExcerpt("abcde", 5)).toBe("abcde");
  });

  it("counts the visible characters, not the markers", () => {
    expect(bodyExcerpt("**abcde**", 5)).toBe("**abcde**");
  });

  it("cuts one character over the limit before the last word", () => {
    expect(bodyExcerpt("un deux trois", 12)).toBe("un deux…");
  });

  it("keeps a word that ends exactly at the limit", () => {
    expect(bodyExcerpt("un deux trois", 7)).toBe("un deux…");
  });

  it("never leaves a bold part half-open", () => {
    expect(bodyExcerpt("Il a dit **très important demain** ici", 24)).toBe(
      "Il a dit **très important**…",
    );
  });

  it("drops a formatted word that does not fit", () => {
    expect(bodyExcerpt("Le vote *historique* hier", 10)).toBe("Le vote…");
  });

  it("cuts a single very long word rather than returning nothing", () => {
    expect(bodyExcerpt("anticonstitutionnellement", 6)).toBe("antico…");
  });
});
