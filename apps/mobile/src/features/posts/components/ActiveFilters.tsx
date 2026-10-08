import { Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, textSizes } from "../../../components/ui/theme";
import type { FeedFilters } from "../api";
import { placeLabel, THEME_LABELS } from "../texts";

const texts = {
  prefix: "Filtres : ",
  weighted: "À la une",
  today: "Aujourd'hui",
  edit: "Modifier",
};

/** While the filters are hidden, reminds the reader which ones are on (nothing when none is). */
export function ActiveFilters({ filters, onEdit }: { filters: FeedFilters; onEdit: () => void }) {
  const labels = [
    filters.sort === "WEIGHTED" ? texts.weighted : null,
    filters.today ? texts.today : null,
    filters.place ? placeLabel(filters.place) : null,
    filters.theme ? THEME_LABELS[filters.theme] : null,
  ].filter((label) => label !== null);
  if (labels.length === 0) {
    return null;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onEdit} style={styles.row}>
      <Text style={styles.text}>
        {texts.prefix}
        {labels.join(" · ")}
        {"  "}
        <Text style={styles.edit}>{texts.edit}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  text: { color: colors.text, fontSize: textSizes.meta },
  edit: { color: colors.brand, fontWeight: "600" },
});
