import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "./theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", loading = false }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onBrand : colors.brand} />
      ) : (
        <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  primary: { backgroundColor: colors.brand },
  secondary: { borderWidth: 1, borderColor: colors.brand },
  pressed: { opacity: 0.8 },
  primaryLabel: { color: colors.onBrand, fontWeight: "600", fontSize: 16 },
  secondaryLabel: { color: colors.brand, fontWeight: "600", fontSize: 16 },
});
