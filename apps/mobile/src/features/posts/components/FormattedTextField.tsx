import { Typeface } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextStyle, View } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { FormattedText } from "../../../components/ui/FormattedText";
import {
  colors,
  radius,
  spacing,
  TYPEFACE_LABELS,
  typefaceFamilies,
} from "../../../components/ui/theme";
import { FORMAT_MARKERS, type TextSelection, wrapSelection } from "../formatting";

const texts = {
  bold: "Mettre en gras",
  italic: "Mettre en italique",
  typeface: (label: string) => `Police du champ ${label}`,
  preview: "Aperçu",
};

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
  error?: string;
};

/**
 * A text block of a post (interface brief): the editor picks its typeface and puts the selected
 * words in bold or italic. The preview shows the result as readers will see it.
 */
export function FormattedTextField(props: Props) {
  const { label, value, onChange, onBlur, typeface, onTypefaceChange, size, multiline, error } =
    props;
  // Mirrors the native cursor, so that « B » and « I » know which words are selected.
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
  const hasMarkers = value.includes(FORMAT_MARKERS.italic);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.toolbar}>
        <FormatButton
          label="B"
          accessibilityLabel={texts.bold}
          style={styles.bold}
          onPress={() => onChange(wrapSelection(value, selection, FORMAT_MARKERS.bold))}
        />
        <FormatButton
          label="I"
          accessibilityLabel={texts.italic}
          style={styles.italic}
          onPress={() => onChange(wrapSelection(value, selection, FORMAT_MARKERS.italic))}
        />
        <View accessibilityLabel={texts.typeface(label)} style={styles.typefaces}>
          {Typeface.options.map((option) => (
            <Chip
              key={option}
              label={TYPEFACE_LABELS[option]}
              selected={option === typeface}
              onPress={() => onTypefaceChange(option)}
            />
          ))}
        </View>
      </View>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        multiline={multiline}
        style={[
          styles.input,
          { fontFamily: typefaceFamilies[typeface], fontSize: size },
          multiline && styles.multiline,
          error ? styles.inputError : null,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {hasMarkers ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{texts.preview}</Text>
          <FormattedText text={value} typeface={typeface} size={size} />
        </View>
      ) : null}
    </View>
  );
}

type FormatButtonProps = {
  label: string;
  accessibilityLabel: string;
  style: TextStyle;
  onPress: () => void;
};

function FormatButton({ label, accessibilityLabel, style, onPress }: FormatButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.formatButton}
    >
      <Text style={[styles.formatLabel, style]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: "600" },
  toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  typefaces: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  formatButton: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
  },
  formatLabel: { color: colors.brand, fontSize: 16 },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger },
  preview: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  previewLabel: { color: colors.muted, fontSize: 12 },
});
