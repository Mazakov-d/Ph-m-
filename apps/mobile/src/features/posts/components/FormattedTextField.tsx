import type { Typeface } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../../components/ui/theme";
import { fontFaceCss } from "../../../components/ui/typefaces";
import RichTextEditor from "./RichTextEditor";
import { TypefacePicker } from "./TypefacePicker";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  typeface: Typeface;
  onTypefaceChange: (typeface: Typeface) => void;
  /** Fixed by the app (interface brief): the editor never chooses the size. */
  size: number;
  multiline: boolean;
  /** Height of the editor, toolbar included. */
  height: number;
  error?: string;
};

/**
 * A text block of a post (interface brief): its typeface, chosen in a list of known fonts, and an
 * editor that shows the bold and italic words as they are typed.
 */
export function FormattedTextField(props: Props) {
  const { label, value, onChange, onBlur, typeface, onTypefaceChange, size, multiline } = props;
  // The editor owns its content once open: it only receives the first value.
  const [initialValue] = useState(value);
  const font = fontFaceCss(typeface);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TypefacePicker label={label} value={typeface} onChange={onTypefaceChange} />
      <RichTextEditor
        label={label}
        initialValue={initialValue}
        fontFamily={font.family}
        fontFaceCss={font.css}
        fontSize={size}
        multiline={multiline}
        height={props.height}
        onChange={onChange}
        onBlur={onBlur}
        // The web view takes the whole width of the form (it has no size of its own).
        dom={{ scrollEnabled: false, style: { height: props.height, width: "100%" } }}
      />
      {props.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: "600" },
  error: { color: colors.danger },
});
