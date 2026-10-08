import { Theme, Zone } from "@fama/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import type { FeedFilters } from "../api";
import { THEME_LABELS, ZONE_LABELS } from "../texts";

const texts = {
  hint: "Combinez une période, une zone et un thème.",
  period: "Période",
  today: "Aujourd'hui",
  zone: "Zone",
  theme: "Thème",
  close: "Masquer les filtres",
  reset: "Tout effacer",
};

type Props = {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  onClose: () => void;
};

/**
 * SPEC §4.3: combinable filters; pressing a selected zone or theme clears it. Interface brief:
 * one group per kind of filter, so that readers see they can combine them.
 */
export function FeedFiltersPanel({ filters, onChange, onClose }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.hint}>{texts.hint}</Text>
      <FilterGroup title={texts.period}>
        <Chip
          label={texts.today}
          selected={filters.today}
          onPress={() => onChange({ ...filters, today: !filters.today })}
        />
      </FilterGroup>
      <FilterGroup title={texts.zone}>
        {Zone.options.map((zone) => (
          <Chip
            key={zone}
            label={ZONE_LABELS[zone]}
            selected={filters.zone === zone}
            onPress={() => onChange({ ...filters, zone: filters.zone === zone ? null : zone })}
          />
        ))}
      </FilterGroup>
      <FilterGroup title={texts.theme}>
        {Theme.options.map((theme) => (
          <Chip
            key={theme}
            label={THEME_LABELS[theme]}
            selected={filters.theme === theme}
            onPress={() => onChange({ ...filters, theme: filters.theme === theme ? null : theme })}
          />
        ))}
      </FilterGroup>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange({ today: false, zone: null, theme: null })}
        >
          <Text style={styles.link}>{texts.reset}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={styles.link}>{texts.close}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    // Floats over the feed.
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  hint: { color: colors.muted, fontSize: textSizes.meta },
  group: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  groupTitle: { fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: colors.brand, fontWeight: "600" },
});
