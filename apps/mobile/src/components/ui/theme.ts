import type { Typeface } from "@fama/shared";
import { Platform } from "react-native";

/**
 * docs/DECISIONS.md (interface brief): the visual base of the app. Text sizes are fixed here
 * (an editor never writes their titles bigger than another one); editors only choose a typeface.
 */
export const colors = {
  brand: "#1d3557",
  brandTint: "#eef2f8",
  brandMuted: "#a8b8d0",
  onBrand: "#ffffff",
  text: "#1b1b1f",
  muted: "#5f6368",
  background: "#f2f2f5",
  surface: "#ffffff",
  border: "#d9d9e0",
  danger: "#c1121f",
  dangerTint: "#fdecea",
  success: "#2d6a4f",
  subtle: "#e9ecef",
  opinionTint: "#fde2c8",
  notice: "#fff3cd",
  commentsBackground: "#e8e8ee",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, pill: 20 } as const;

/** Fixed sizes of the post blocks: the same for every editor. */
export const textSizes = {
  postTitle: 22,
  cardTitle: 18,
  summary: 16,
  body: 16,
  meta: 13,
} as const;

/** System typefaces, available without a download on iOS, Android and the web. */
export const typefaceFamilies: Record<Typeface, string> = Platform.select({
  ios: { SANS: "System", SERIF: "Georgia", MONO: "Menlo" },
  android: { SANS: "sans-serif", SERIF: "serif", MONO: "monospace" },
  default: {
    SANS: "system-ui, -apple-system, sans-serif",
    SERIF: "Georgia, 'Times New Roman', serif",
    MONO: "ui-monospace, Menlo, monospace",
  },
});

/** Labels of the typeface choice in the publishing form. */
export const TYPEFACE_LABELS: Record<Typeface, string> = {
  SANS: "Sans empattement",
  SERIF: "Avec empattement",
  MONO: "Machine à écrire",
};

/** Two columns from this width, three from the next one (web, tablets). */
export const gridBreakpoints = { twoColumns: 760, threeColumns: 1140 } as const;
