import { parseInlineFormatting, type Typeface } from "@fama/shared";
import { Text, type TextStyle } from "react-native";
import { fontFamilyOf, useTypeface } from "./typefaces";

type Props = {
  text: string;
  typeface: Typeface;
  size: number;
  /** A title is always bold: its words use the bold font. */
  alwaysBold?: boolean;
  /** Extra style of the whole text (color, line height, alignment); never a weight or a font. */
  style?: TextStyle;
  numberOfLines?: number;
};

/** A post text with the editor's typeface and their bold or italic words (interface brief). */
export function FormattedText(props: Props) {
  const { text, typeface, size, alwaysBold = false, style, numberOfLines } = props;
  const ready = useTypeface(typeface);

  // Each variant is its own font file; until it is downloaded, the system font is bold or italic.
  const styleOf = (bold: boolean, italic: boolean): TextStyle =>
    ready
      ? { fontFamily: fontFamilyOf(typeface, { bold, italic }) }
      : { fontWeight: bold ? "bold" : "normal", fontStyle: italic ? "italic" : "normal" };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontSize: size }, styleOf(alwaysBold, false), style]}
    >
      {parseInlineFormatting(text).map((segment, index) => (
        <Text key={index} style={styleOf(alwaysBold || segment.bold, segment.italic)}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}
