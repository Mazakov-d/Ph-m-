import { Theme, Zone } from "@fama/shared";
import { ScrollView, StyleSheet } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import type { FeedFilters } from "../api";
import { THEME_LABELS, ZONE_LABELS } from "../texts";

const texts = { today: "Aujourd'hui" };

type Props = { filters: FeedFilters; onChange: (filters: FeedFilters) => void };

/** SPEC §4.3: combinable filters; pressing a selected zone or theme clears it. */
export function FeedFiltersBar({ filters, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.bar}
    >
      <Chip
        label={texts.today}
        selected={filters.today}
        onPress={() => onChange({ ...filters, today: !filters.today })}
      />
      {Zone.options.map((zone) => (
        <Chip
          key={zone}
          label={ZONE_LABELS[zone]}
          selected={filters.zone === zone}
          onPress={() => onChange({ ...filters, zone: filters.zone === zone ? null : zone })}
        />
      ))}
      {Theme.options.map((theme) => (
        <Chip
          key={theme}
          label={THEME_LABELS[theme]}
          selected={filters.theme === theme}
          onPress={() => onChange({ ...filters, theme: filters.theme === theme ? null : theme })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ bar: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 } });
