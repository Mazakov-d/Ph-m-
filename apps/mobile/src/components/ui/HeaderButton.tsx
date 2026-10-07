import { Pressable, StyleSheet, Text } from "react-native";

type HeaderButtonProps = { label: string; onPress: () => void };

export function HeaderButton({ label, onPress }: HeaderButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 12, paddingVertical: 6 },
  label: { color: "#1d3557", fontWeight: "600", fontSize: 16 },
});
