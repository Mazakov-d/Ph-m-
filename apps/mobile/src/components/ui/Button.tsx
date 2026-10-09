import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "./theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  /** For a button that unfolds a content under it: open or closed (shows ▴ or ▾). */
  expanded?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  expanded,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const labelStyle = isPrimary ? styles.primaryLabel : styles.secondaryLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading, expanded }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        expanded && styles.open,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onBrand : colors.brand} />
      ) : (
        <>
          <Text style={labelStyle}>{label}</Text>
          {expanded === undefined ? null : (
            <Text importantForAccessibility="no" style={labelStyle}>
              {expanded ? "▴" : "▾"}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primary: { backgroundColor: colors.brand },
  secondary: { borderWidth: 1, borderColor: colors.brand },
  open: { backgroundColor: colors.brandTint },
  pressed: { opacity: 0.8 },
  primaryLabel: { color: colors.onBrand, fontWeight: "600", fontSize: 16 },
  secondaryLabel: { color: colors.brand, fontWeight: "600", fontSize: 16 },
});
