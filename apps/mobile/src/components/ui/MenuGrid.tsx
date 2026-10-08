import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "./theme";

export type MenuItem = { label: string; description: string; onPress: () => void };

// Two columns from this window width (the box of the account is 760 wide at most).
const TWO_COLUMNS_MIN_WIDTH = 600;

/** todo.txt: the menu of the moderation's account, in rows and columns (cards). */
export function MenuGrid({ items }: { items: MenuItem[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;
  const rows: MenuItem[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((item) => item.label).join()} style={styles.row}>
          {row.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </Pressable>
          ))}
          {row.length < columns ? <View style={styles.empty} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  tile: {
    flex: 1,
    gap: 4,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.8 },
  label: { fontWeight: "bold", color: colors.brand },
  description: { color: colors.muted, fontSize: 13 },
  empty: { flex: 1 },
});
