import { parseInlineFormatting, type Typeface } from "@fama/shared";
import { StyleSheet, Text, type TextStyle } from "react-native";
import { typefaceFamilies } from "./theme";

type Props = {
  text: string;
  typeface: Typeface;
  size: number;
  /** Extra style of the whole text (weight of a title, line height of a body). */
  style?: TextStyle;
  numberOfLines?: number;
};

/** A post text with the editor's typeface and their bold or italic words (interface brief). */
export function FormattedText({ text, typeface, size, style, numberOfLines }: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: typefaceFamilies[typeface], fontSize: size }, style]}
    >
      {parseInlineFormatting(text).map((segment, index) => (
        <Text key={index} style={[segment.bold && styles.bold, segment.italic && styles.italic]}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
});
