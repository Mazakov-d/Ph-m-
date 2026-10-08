import type { EditorReliabilityLevel } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors, textSizes } from "../../../components/ui/theme";

// SPEC §5.7: the tiers shown to readers (never the score).
const LEVELS: Record<EditorReliabilityLevel, { label: string; color: string; filled: number }> = {
  VERY_RELIABLE: { label: "Très fiable", color: colors.success, filled: 3 },
  RELIABLE: { label: "Fiable", color: colors.brand, filled: 2 },
  VIGILANCE: { label: "Vigilance", color: colors.danger, filled: 1 },
  INSUFFICIENT_HISTORY: { label: "Historique insuffisant", color: colors.muted, filled: 0 },
};
const SEGMENTS = [1, 2, 3];

/** SPEC §5.7: the reliability gauge of an editor account, as three segments and a tier. */
export function ReliabilityGauge({ level }: { level: EditorReliabilityLevel }) {
  const { label, color, filled } = LEVELS[level];
  return (
    <View accessible accessibilityLabel={`Fiabilité de l'éditeur : ${label}`} style={styles.gauge}>
      <View style={styles.segments}>
        {SEGMENTS.map((segment) => (
          <View
            key={segment}
            style={[styles.segment, { backgroundColor: segment <= filled ? color : colors.border }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gauge: { flexDirection: "row", alignItems: "center", gap: 6 },
  segments: { flexDirection: "row", gap: 2 },
  segment: { width: 10, height: 6, borderRadius: 2 },
  label: { fontSize: textSizes.meta, fontWeight: "600" },
});
