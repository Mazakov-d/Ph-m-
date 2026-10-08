import { Typeface } from "@fama/shared";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";
import { fontFamilyOf, TYPEFACES } from "../../../components/ui/typefaces";

const texts = { label: (field: string) => `Police du champ ${field}` };

type Props = { label: string; value: Typeface; onChange: (typeface: Typeface) => void };

/** The typefaces offered to editors, each name written in its own font (interface brief). */
export function TypefacePicker({ label, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={texts.label(label)}
      contentContainerStyle={styles.row}
    >
      {Typeface.options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text
              style={[
                styles.name,
                { fontFamily: fontFamilyOf(option, { bold: false, italic: false }) },
                selected && styles.selectedName,
              ]}
            >
              {TYPEFACES[option].label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.brand, backgroundColor: colors.brand },
  name: { fontSize: 15, color: colors.text },
  selectedName: { color: colors.onBrand },
});
