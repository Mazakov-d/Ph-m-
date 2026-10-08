import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../components/ui/theme";

type Props = { label: string; percentage: number; isMine: boolean };

/** One choice with its share of the votes (SPEC §7, docs/DECISIONS.md). */
export function VoteResultRow({ label, percentage, isMine }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${percentage} %${isMine ? ", votre choix" : ""}`}
      style={styles.row}
    >
      <View style={styles.labels}>
        <Text style={isMine ? styles.mine : undefined}>{isMine ? `✓ ${label}` : label}</Text>
        <Text style={isMine ? styles.mine : undefined}>{`${percentage} %`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, isMine && styles.mineFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4 },
  labels: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  mine: { fontWeight: "bold" },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.subtle, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.brandMuted },
  mineFill: { backgroundColor: colors.brand },
});
