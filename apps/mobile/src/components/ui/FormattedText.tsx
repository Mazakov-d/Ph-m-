import { parseInlineFormatting, type Typeface } from "@fama/shared";
import { Text, type TextStyle } from "react-native";
import { fontFamilyOf } from "./typefaces";

type Props = {
  text: string;
  typeface: Typeface;
  size: number;
  /** A title is always bold: its words use the bold font. */
  alwaysBold?: boolean;
  /** Extra style of the whole text (color, line height); never a weight or a font. */
  style?: TextStyle;
  numberOfLines?: number;
};

/** A post text with the editor's typeface and their bold or italic words (interface brief). */
export function FormattedText(props: Props) {
  const { text, typeface, size, alwaysBold = false, style, numberOfLines } = props;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: fontFamilyOf(typeface, { bold: alwaysBold, italic: false }), fontSize: size },
        style,
      ]}
    >
      {parseInlineFormatting(text).map((segment, index) => (
        <Text
          key={index}
          style={{
            fontFamily: fontFamilyOf(typeface, {
              bold: alwaysBold || segment.bold,
              italic: segment.italic,
            }),
          }}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}
