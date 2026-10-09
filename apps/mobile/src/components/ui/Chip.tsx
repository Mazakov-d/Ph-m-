import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "./theme";

type ChipProps = { label: string; selected: boolean; onPress: () => void };

/** A selectable filter or choice. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={selected ? styles.selectedLabel : styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    // A long label wraps inside the chip instead of leaving its box (narrow phones, web).
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selected: { backgroundColor: colors.brand },
  label: { flexShrink: 1, color: colors.brand },
  selectedLabel: { flexShrink: 1, color: colors.onBrand, fontWeight: "600" },
});
