import { Typeface } from "@fama/shared";
import { fontFaceCss, fontFamilyOf, fontUrl, TYPEFACES } from "../typefaces";

describe("typefaces (interface brief: a list of known fonts)", () => {
  it("offers at least thirty typefaces, each with a name", () => {
    expect(Typeface.options.length).toBeGreaterThanOrEqual(30);
    for (const typeface of Typeface.options) {
      expect(TYPEFACES[typeface].label).not.toBe("");
    }
  });

  it("downloads each variant from the font CDN", () => {
    expect(fontUrl("EB_GARAMOND", { weight: 700, style: "italic" }, "ttf")).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-italic.ttf",
    );
  });

  it("names one font per variant", () => {
    expect(fontFamilyOf("LORA", { bold: true, italic: false })).toBe("lora-700-normal");
    expect(fontFamilyOf("LORA", { bold: false, italic: true })).toBe("lora-400-italic");
  });

  it("declares the four variants for the text editor", () => {
    const { family, css } = fontFaceCss("PT_SERIF");
    expect(family).toBe("'Fama PT Serif', serif");
    expect(css.match(/@font-face/g)).toHaveLength(4);
    expect(css).toContain("font-weight: 700; font-style: italic;");
  });
});
