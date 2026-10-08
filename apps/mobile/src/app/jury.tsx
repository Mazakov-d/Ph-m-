import { VERDICT_LABELS } from "@fama/shared";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CenteredBox } from "../components/ui/CenteredBox";
import { colors, radius, spacing } from "../components/ui/theme";
import { useJuryAssignments } from "../features/jury/api";
import { JuryVoteForm } from "../features/jury/components/JuryVoteForm";
import { formatDeadline, juryErrorMessage } from "../features/jury/texts";
import { PostCard } from "../features/posts/components/PostCard";

const texts = {
  title: "Mes jurys",
  intro:
    "Vous avez été tiré au sort pour examiner ces articles. Votre vote reste anonyme ; la modération rend le verdict final.",
  empty: "Aucun article à examiner pour l'instant.",
  deadline: (date: string) => `À voter avant le ${date}`,
  voted: (verdict: string) => `Votre vote : ${verdict}`,
};

/** SPEC §5.8: the articles the reader was drawn to examine, and their votes. */
export default function JuryScreen() {
  const assignments = useJuryAssignments();
  return (
    <CenteredBox size="medium">
      <Stack.Screen options={{ title: texts.title }} />
      <Text accessibilityRole="header" style={styles.title}>
        {texts.title}
      </Text>
      <Text style={styles.muted}>{texts.intro}</Text>
      {assignments.isPending ? <ActivityIndicator /> : null}
      {assignments.error ? <Text>{juryErrorMessage(assignments.error)}</Text> : null}
      {assignments.data?.length === 0 ? <Text>{texts.empty}</Text> : null}
      {assignments.data?.map((seat) => (
        <View key={seat.id} style={styles.seat}>
          <PostCard post={seat.post} />
          {seat.vote ? (
            <Text style={styles.voted}>{texts.voted(VERDICT_LABELS[seat.vote.verdict])}</Text>
          ) : (
            <>
              <Text style={styles.muted}>{texts.deadline(formatDeadline(seat.deadline))}</Text>
              <JuryVoteForm seatId={seat.id} />
            </>
          )}
        </View>
      ))}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold", color: colors.text },
  muted: { color: colors.muted },
  seat: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  voted: {
    fontWeight: "600",
    color: colors.success,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
});
