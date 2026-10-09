import { type ReactNode, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Button } from "./Button";
import { colors, radius, spacing } from "./theme";

/** A button of the dashboard: it opens a page, or unfolds its content under its row. */
export type DashboardItem =
  | { label: string; onPress: () => void }
  | { label: string; content: (close: () => void) => ReactNode };

// Interface brief: two columns of buttons from this window width.
const TWO_COLUMNS_MIN_WIDTH = 760;

/**
 * Interface brief: the dashboard's buttons, all alike, in rows and columns. A button with a
 * content unfolds it under its row (one at a time) and folds it on a second press.
 */
export function DashboardGrid({ items }: { items: DashboardItem[] }) {
  const { width } = useWindowDimensions();
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const columns = width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;
  const rows: DashboardItem[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row) => {
        const open = row.find((item) => item.label === openLabel);
        return (
          <View key={row.map((item) => item.label).join()} style={styles.grid}>
            <View style={styles.row}>
              {row.map((item) => (
                <View key={item.label} style={styles.cell}>
                  {"content" in item ? (
                    <Button
                      label={item.label}
                      variant="secondary"
                      expanded={item.label === openLabel}
                      onPress={() => setOpenLabel(item.label === openLabel ? null : item.label)}
                    />
                  ) : (
                    <Button label={item.label} variant="secondary" onPress={item.onPress} />
                  )}
                </View>
              ))}
              {row.length < columns ? <View style={styles.cell} /> : null}
            </View>
            {open && "content" in open ? (
              <View style={styles.panel}>{open.content(() => setOpenLabel(null))}</View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  cell: { flex: 1 },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
  },
});
