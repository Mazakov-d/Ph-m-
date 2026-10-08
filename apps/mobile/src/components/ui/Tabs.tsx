import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./theme";

type Props<Tab extends string> = {
  tabs: { id: Tab; label: string }[];
  current: Tab;
  onChange: (tab: Tab) => void;
};

/** Tabs inside a page; the current one is greyed (interface brief). */
export function Tabs<Tab extends string>({ tabs, current, onChange }: Props<Tab>) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab.id === current }}
          onPress={() => onChange(tab.id)}
          style={[styles.tab, tab.id === current && styles.current]}
        >
          <Text style={styles.label}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  current: { backgroundColor: colors.subtle },
  label: { fontWeight: "600", color: colors.brand },
});
