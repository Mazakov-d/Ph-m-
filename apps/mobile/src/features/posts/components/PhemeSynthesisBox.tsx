import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";

const texts = {
  title: "La synthèse de Phémé",
  soon: "Bientôt",
  body: "Jadis, Phémé mêlait le vrai au faux. Bientôt, c'est elle qui les démêlera : une synthèse neutre de tous ces articles, sans prendre parti.",
};

/**
 * docs/DECISIONS.md (Phémé's synthesis): above the similar posts, the place of the coming AI
 * summary of them. For now it only announces it.
 */
export function PhemeSynthesisBox() {
  return (
    <View accessibilityRole="summary" style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.soon}>{texts.soon}</Text>
      </View>
      <Text style={styles.body}>{texts.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
  },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  title: { fontSize: textSizes.cardTitle, fontWeight: "bold", color: colors.brand },
  soon: {
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    overflow: "hidden",
    fontSize: textSizes.meta,
    fontWeight: "600",
    color: colors.onBrand,
    backgroundColor: colors.brand,
  },
  body: { fontStyle: "italic", color: colors.text, lineHeight: 22 },
});
