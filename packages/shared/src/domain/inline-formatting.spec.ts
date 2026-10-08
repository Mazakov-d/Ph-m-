import { describe, expect, it } from "vitest";
import {
  formatSegments,
  parseInlineFormatting,
  stripInlineFormatting,
} from "./inline-formatting.js";

const plain = (text: string) => ({ text, bold: false, italic: false });

describe("parseInlineFormatting (docs/DECISIONS.md, interface brief)", () => {
  it("keeps a text without markers as one plain segment", () => {
    expect(parseInlineFormatting("Le budget adopté")).toEqual([plain("Le budget adopté")]);
  });

  it("returns no segment for an empty text", () => {
    expect(parseInlineFormatting("")).toEqual([]);
  });

  it("finds bold and italic parts in reading order", () => {
    expect(parseInlineFormatting("Un **vote** très *serré* hier")).toEqual([
      plain("Un "),
      { text: "vote", bold: true, italic: false },
      plain(" très "),
      { text: "serré", bold: false, italic: true },
      plain(" hier"),
    ]);
  });

  it("accepts several words and a single letter between markers", () => {
    expect(parseInlineFormatting("**deux mots** *a*")).toEqual([
      { text: "deux mots", bold: true, italic: false },
      plain(" "),
      { text: "a", bold: false, italic: true },
    ]);
  });

  it("ignores markers that do not touch a word on their inside", () => {
    expect(parseInlineFormatting("5 * 3 * 2")).toEqual([plain("5 * 3 * 2")]);
    expect(parseInlineFormatting("** pas gras **")).toEqual([plain("** pas gras **")]);
  });

  it("leaves an unclosed marker as text", () => {
    expect(parseInlineFormatting("un **début")).toEqual([plain("un **début")]);
  });
});

describe("formatSegments", () => {
  it("is the inverse of parseInlineFormatting", () => {
    const text = "Un **vote** très *serré* hier";
    expect(formatSegments(parseInlineFormatting(text))).toBe(text);
  });
});

describe("stripInlineFormatting", () => {
  it("removes the markers and keeps the words", () => {
    expect(stripInlineFormatting("Un **vote** très *serré*")).toBe("Un vote très serré");
  });
});
