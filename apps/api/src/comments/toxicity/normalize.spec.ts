import { containsPhrase, normalizeWords } from "./normalize.js";

describe("normalizeWords", () => {
  it("lowers the case and removes accents and punctuation", () => {
    expect(normalizeWords("Ça, c'est ÉNORME !")).toEqual(["ca", "c", "est", "enorme"]);
  });

  it("undoes l33t substitutions", () => {
    expect(normalizeWords("c0nn4rd")).toEqual(normalizeWords("connard"));
    expect(normalizeWords("$@l0pe")).toEqual(normalizeWords("salope"));
  });

  it("joins letters written one by one", () => {
    expect(normalizeWords("c o n n a r d")).toEqual(normalizeWords("connard"));
    expect(normalizeWords("c.o.n.n.a.r.d")).toEqual(normalizeWords("connard"));
  });

  it("collapses repeated letters", () => {
    expect(normalizeWords("connnnnaaaard")).toEqual(normalizeWords("connard"));
  });

  it("drops plural marks of longer words", () => {
    expect(normalizeWords("connards")).toEqual(normalizeWords("connard"));
  });
});

describe("containsPhrase", () => {
  it("matches consecutive whole words only", () => {
    const words = normalizeWords("ce contexte est clair");
    expect(containsPhrase(words, ["contexte"])).toBe(true);
    expect(containsPhrase(words, ["con"])).toBe(false);
    expect(containsPhrase(words, ["est", "clair"])).toBe(true);
    expect(containsPhrase(words, ["clair", "est"])).toBe(false);
  });
});
