import type { Typeface } from "@fama/shared";
import { isLoaded, loadAsync } from "expo-font";
import { useEffect, useState } from "react";

export type TypefaceCategory = "SANS" | "SERIF" | "MONO";
type TextStyleFlags = { bold: boolean; italic: boolean };

/** Headings of the typeface list, in the order they are shown. */
export const TYPEFACE_CATEGORIES: { category: TypefaceCategory; label: string }[] = [
  { category: "SANS", label: "Sans empattement" },
  { category: "SERIF", label: "Avec empattement" },
  { category: "MONO", label: "Chasse fixe" },
];

/**
 * docs/DECISIONS.md (interface brief): the typefaces offered to editors, well-known open fonts
 * (Google Fonts). `id` names the font on the Fontsource CDN, which serves them all in the four
 * variants the app uses (regular, bold, italic, bold italic).
 */
export const TYPEFACES: Record<
  Typeface,
  { label: string; id: string; category: TypefaceCategory }
> = {
  INTER: { label: "Inter", id: "inter", category: "SANS" },
  ROBOTO: { label: "Roboto", id: "roboto", category: "SANS" },
  OPEN_SANS: { label: "Open Sans", id: "open-sans", category: "SANS" },
  LATO: { label: "Lato", id: "lato", category: "SANS" },
  MONTSERRAT: { label: "Montserrat", id: "montserrat", category: "SANS" },
  POPPINS: { label: "Poppins", id: "poppins", category: "SANS" },
  RALEWAY: { label: "Raleway", id: "raleway", category: "SANS" },
  NUNITO: { label: "Nunito", id: "nunito", category: "SANS" },
  WORK_SANS: { label: "Work Sans", id: "work-sans", category: "SANS" },
  SOURCE_SANS_3: { label: "Source Sans 3", id: "source-sans-3", category: "SANS" },
  NOTO_SANS: { label: "Noto Sans", id: "noto-sans", category: "SANS" },
  PT_SANS: { label: "PT Sans", id: "pt-sans", category: "SANS" },
  UBUNTU: { label: "Ubuntu", id: "ubuntu", category: "SANS" },
  FIRA_SANS: { label: "Fira Sans", id: "fira-sans", category: "SANS" },
  RUBIK: { label: "Rubik", id: "rubik", category: "SANS" },
  IBM_PLEX_SANS: { label: "IBM Plex Sans", id: "ibm-plex-sans", category: "SANS" },
  MERRIWEATHER: { label: "Merriweather", id: "merriweather", category: "SERIF" },
  PLAYFAIR_DISPLAY: { label: "Playfair Display", id: "playfair-display", category: "SERIF" },
  LORA: { label: "Lora", id: "lora", category: "SERIF" },
  EB_GARAMOND: { label: "EB Garamond", id: "eb-garamond", category: "SERIF" },
  CRIMSON_TEXT: { label: "Crimson Text", id: "crimson-text", category: "SERIF" },
  PT_SERIF: { label: "PT Serif", id: "pt-serif", category: "SERIF" },
  NOTO_SERIF: { label: "Noto Serif", id: "noto-serif", category: "SERIF" },
  SOURCE_SERIF_4: { label: "Source Serif 4", id: "source-serif-4", category: "SERIF" },
  CORMORANT_GARAMOND: {
    label: "Cormorant Garamond",
    id: "cormorant-garamond",
    category: "SERIF",
  },
  BITTER: { label: "Bitter", id: "bitter", category: "SERIF" },
  ALEGREYA: { label: "Alegreya", id: "alegreya", category: "SERIF" },
  ARVO: { label: "Arvo", id: "arvo", category: "SERIF" },
  IBM_PLEX_MONO: { label: "IBM Plex Mono", id: "ibm-plex-mono", category: "MONO" },
  JETBRAINS_MONO: { label: "JetBrains Mono", id: "jetbrains-mono", category: "MONO" },
  SOURCE_CODE_PRO: { label: "Source Code Pro", id: "source-code-pro", category: "MONO" },
  ROBOTO_MONO: { label: "Roboto Mono", id: "roboto-mono", category: "MONO" },
  SPACE_MONO: { label: "Space Mono", id: "space-mono", category: "MONO" },
};

const FONT_CDN = "https://cdn.jsdelivr.net/fontsource/fonts";
// Latin covers French (accents, ç, œ, «»).
const SUBSET = "latin";
const GENERIC_FAMILIES: Record<TypefaceCategory, string> = {
  SANS: "sans-serif",
  SERIF: "serif",
  MONO: "monospace",
};

type Variant = { weight: 400 | 700; style: "normal" | "italic" };

function variantOf({ bold, italic }: TextStyleFlags): Variant {
  return { weight: bold ? 700 : 400, style: italic ? "italic" : "normal" };
}

const REGULAR: Variant = { weight: 400, style: "normal" };
const ALL_VARIANTS: Variant[] = [
  REGULAR,
  { weight: 700, style: "normal" },
  { weight: 400, style: "italic" },
  { weight: 700, style: "italic" },
];

/** Where a variant of a typeface is downloaded from. */
export function fontUrl(typeface: Typeface, variant: Variant, format: "ttf" | "woff2"): string {
  const { id } = TYPEFACES[typeface];
  return `${FONT_CDN}/${id}@latest/${SUBSET}-${variant.weight}-${variant.style}.${format}`;
}

/** The name under which a variant is loaded, used as `fontFamily` (one font file per variant). */
export function fontFamilyOf(typeface: Typeface, style: TextStyleFlags): string {
  const { weight, style: fontStyle } = variantOf(style);
  return `${TYPEFACES[typeface].id}-${weight}-${fontStyle}`;
}

/**
 * The CSS that declares a typeface for the text editor (a web view): one family, with its four
 * variants, so that the browser picks the bold or italic file itself.
 */
export function fontFaceCss(typeface: Typeface): { family: string; css: string } {
  const name = `Fama ${TYPEFACES[typeface].label}`;
  const css = ALL_VARIANTS.map(
    (variant) =>
      `@font-face { font-family: '${name}'; font-weight: ${variant.weight}; ` +
      `font-style: ${variant.style}; font-display: swap; ` +
      `src: url('${fontUrl(typeface, variant, "woff2")}') format('woff2'); }`,
  ).join("\n");
  return { family: `'${name}', ${GENERIC_FAMILIES[TYPEFACES[typeface].category]}`, css };
}

/** The font files of a typeface to download: all four variants, or only the regular one. */
function fontsToLoad(typeface: Typeface, onlyRegular: boolean): { name: string; url: string }[] {
  return (onlyRegular ? [REGULAR] : ALL_VARIANTS).map((variant) => ({
    name: fontFamilyOf(typeface, {
      bold: variant.weight === 700,
      italic: variant.style === "italic",
    }),
    url: fontUrl(typeface, variant, "ttf"),
  }));
}

/**
 * Downloads a typeface when a screen needs it, once for the whole app (expo-font keeps it).
 * Returns true once it can be used; until then texts show in the system font. With
 * `onlyRegular`, only the regular variant is loaded (the names in the typeface list).
 */
export function useTypeface(typeface: Typeface, onlyRegular = false): boolean {
  const key = `${typeface}:${onlyRegular}`;
  const alreadyLoaded = fontsToLoad(typeface, onlyRegular).every((font) => isLoaded(font.name));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Downloading font files: a native API, outside React.
  useEffect(() => {
    if (alreadyLoaded) return;
    let active = true;
    const fonts = fontsToLoad(typeface, onlyRegular);
    loadAsync(Object.fromEntries(fonts.map((font) => [font.name, font.url])))
      .then(() => {
        if (active) setLoadedKey(key);
      })
      // No network: the text stays in the system font.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [typeface, onlyRegular, key, alreadyLoaded]);

  return alreadyLoaded || loadedKey === key;
}
