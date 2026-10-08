import { type JuryModeration, VERDICT_LABELS } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";

const texts = {
  title: "Avis du jury",
  none: "Aucun lecteur n'a pu être tiré au sort : vous jugez seul.",
  pending: (count: number) =>
    count === 1 ? "1 juré n'a pas encore voté." : `${count} jurés n'ont pas encore voté.`,
};

/** SPEC §5.8: what the moderator sees of the jury — each vote, its source, who cast it. */
export function JuryVotes({ jury }: { jury: JuryModeration | null }) {
  if (!jury) return <Text style={styles.muted}>{texts.none}</Text>;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{texts.title}</Text>
      {jury.pending > 0 ? <Text style={styles.pending}>{texts.pending(jury.pending)}</Text> : null}
      {jury.votes.map((vote) => (
        <View key={`${vote.pseudo}-${vote.votedAt}`} style={styles.vote}>
          <Text style={styles.verdict}>{`${vote.pseudo} : ${VERDICT_LABELS[vote.verdict]}`}</Text>
          <Text style={styles.muted}>{vote.source}</Text>
          {vote.note ? <Text>{vote.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  title: { fontWeight: "bold", color: colors.text },
  pending: { color: colors.danger, fontWeight: "600" },
  vote: { gap: 2 },
  verdict: { fontWeight: "600", color: colors.text },
  muted: { color: colors.muted },
});
