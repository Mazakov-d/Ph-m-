import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_400Regular_Italic } from "@expo-google-fonts/ibm-plex-mono/400Regular_Italic";
import { IBMPlexMono_700Bold } from "@expo-google-fonts/ibm-plex-mono/700Bold";
import { IBMPlexMono_700Bold_Italic } from "@expo-google-fonts/ibm-plex-mono/700Bold_Italic";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_400Regular_Italic } from "@expo-google-fonts/inter/400Regular_Italic";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_700Bold_Italic } from "@expo-google-fonts/inter/700Bold_Italic";
import { Lora_400Regular } from "@expo-google-fonts/lora/400Regular";
import { Lora_400Regular_Italic } from "@expo-google-fonts/lora/400Regular_Italic";
import { Lora_700Bold } from "@expo-google-fonts/lora/700Bold";
import { Lora_700Bold_Italic } from "@expo-google-fonts/lora/700Bold_Italic";
import { Merriweather_400Regular } from "@expo-google-fonts/merriweather/400Regular";
import { Merriweather_400Regular_Italic } from "@expo-google-fonts/merriweather/400Regular_Italic";
import { Merriweather_700Bold } from "@expo-google-fonts/merriweather/700Bold";
import { Merriweather_700Bold_Italic } from "@expo-google-fonts/merriweather/700Bold_Italic";
import { PlayfairDisplay_400Regular } from "@expo-google-fonts/playfair-display/400Regular";
import { PlayfairDisplay_400Regular_Italic } from "@expo-google-fonts/playfair-display/400Regular_Italic";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { PlayfairDisplay_700Bold_Italic } from "@expo-google-fonts/playfair-display/700Bold_Italic";
import type { Typeface } from "@fama/shared";
import { useFonts } from "expo-font";

type TypefaceStyle = { bold: boolean; italic: boolean };

/**
 * docs/DECISIONS.md (interface brief): the typefaces offered to editors. Each one is bundled with
 * the app in four variants, because a custom font has no automatic bold or italic on Android.
 * `css` names the same font for the text editor, which runs in a web view.
 */
export const TYPEFACES: Record<
  Typeface,
  { label: string; css: string; regular: string; bold: string; italic: string; boldItalic: string }
> = {
  SANS: {
    label: "Inter",
    css: "'Inter', sans-serif",
    regular: "Inter_400Regular",
    bold: "Inter_700Bold",
    italic: "Inter_400Regular_Italic",
    boldItalic: "Inter_700Bold_Italic",
  },
  SERIF: {
    label: "Merriweather",
    css: "'Merriweather', serif",
    regular: "Merriweather_400Regular",
    bold: "Merriweather_700Bold",
    italic: "Merriweather_400Regular_Italic",
    boldItalic: "Merriweather_700Bold_Italic",
  },
  MONO: {
    label: "IBM Plex Mono",
    css: "'IBM Plex Mono', monospace",
    regular: "IBMPlexMono_400Regular",
    bold: "IBMPlexMono_700Bold",
    italic: "IBMPlexMono_400Regular_Italic",
    boldItalic: "IBMPlexMono_700Bold_Italic",
  },
  DISPLAY: {
    label: "Playfair Display",
    css: "'Playfair Display', serif",
    regular: "PlayfairDisplay_400Regular",
    bold: "PlayfairDisplay_700Bold",
    italic: "PlayfairDisplay_400Regular_Italic",
    boldItalic: "PlayfairDisplay_700Bold_Italic",
  },
  BOOK: {
    label: "Lora",
    css: "'Lora', serif",
    regular: "Lora_400Regular",
    bold: "Lora_700Bold",
    italic: "Lora_400Regular_Italic",
    boldItalic: "Lora_700Bold_Italic",
  },
};

/** The font file to use for a typeface in bold, italic, both or neither. */
export function fontFamilyOf(typeface: Typeface, style: TypefaceStyle): string {
  const fonts = TYPEFACES[typeface];
  if (style.bold && style.italic) return fonts.boldItalic;
  if (style.bold) return fonts.bold;
  if (style.italic) return fonts.italic;
  return fonts.regular;
}

/** Loads every bundled font; true once they can be used (or failed to load: system font then). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_700Bold,
    Inter_700Bold_Italic,
    Merriweather_400Regular,
    Merriweather_400Regular_Italic,
    Merriweather_700Bold,
    Merriweather_700Bold_Italic,
    IBMPlexMono_400Regular,
    IBMPlexMono_400Regular_Italic,
    IBMPlexMono_700Bold,
    IBMPlexMono_700Bold_Italic,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_700Bold,
    Lora_700Bold_Italic,
  });
  return loaded || error !== null;
}
