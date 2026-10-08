import { CITIES, isLocality, LOCALITIES, type Place, REGIONS, WIDE_ZONES } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { colors, spacing } from "../../../components/ui/theme";
import { placeLabel } from "../texts";

const texts = {
  regions: (open: boolean) => `${open ? "▾" : "▸"} Régions`,
  cities: (open: boolean) => `${open ? "▾" : "▸"} Villes`,
};

type Props = {
  label?: string;
  value: Place | null;
  /** `null` when the selected place is pressed again (filters); a post always has a place. */
  onChange: (place: Place | null) => void;
  error?: string;
};

/**
 * docs/DECISIONS.md (places): one list, in this order — International, Europe, France, then the
 * regions and the cities, each group folded until opened (open when it holds the choice).
 */
export function PlacePicker({ label, value, onChange, error }: Props) {
  const chosenKind = value && isLocality(value) ? LOCALITIES[value].kind : null;
  const [regionsOpen, setRegionsOpen] = useState(chosenKind === "REGION");
  const [citiesOpen, setCitiesOpen] = useState(chosenKind === "CITY");

  const chip = (place: Place) => (
    <Chip
      key={place}
      label={placeLabel(place)}
      selected={value === place}
      onPress={() => onChange(value === place ? null : place)}
    />
  );

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips}>{WIDE_ZONES.map(chip)}</View>
      <Group title={texts.regions(regionsOpen)} onToggle={() => setRegionsOpen(!regionsOpen)} />
      {regionsOpen ? <View style={styles.chips}>{REGIONS.map(chip)}</View> : null}
      <Group title={texts.cities(citiesOpen)} onToggle={() => setCitiesOpen(!citiesOpen)} />
      {citiesOpen ? <View style={styles.chips}>{CITIES.map(chip)}</View> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Group({ title, onToggle }: { title: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onToggle}>
      <Text style={styles.group}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  group: { color: colors.brand, fontWeight: "600" },
  error: { color: colors.danger },
});
