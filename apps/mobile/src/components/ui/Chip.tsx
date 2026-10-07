import { Pressable, StyleSheet, Text } from "react-native";

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
    borderWidth: 1,
    borderColor: "#1d3557",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selected: { backgroundColor: "#1d3557" },
  label: { color: "#1d3557" },
  selectedLabel: { color: "#fff", fontWeight: "600" },
});
