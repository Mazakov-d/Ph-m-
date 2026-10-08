import { stripInlineFormatting, VERDICT_LABELS } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { VerdictForm } from "../../../features/reviews/components/VerdictForm";
import { useAppeals, useGiveVerdict } from "../../../features/reviews/moderationApi";
import { reviewErrorMessage } from "../../../features/reviews/texts";
import { colors } from "../../../components/ui/theme";

const texts = {
  title: "Trancher l'appel",
  notFound: "Cet appel n'est plus en attente.",
  original: (label: string) => `Premier verdict : ${label}`,
  reason: (reason: string) => `Raison de l'appel : ${reason}`,
  final: "Votre verdict est définitif.",
};

/** SPEC §5.5: another moderator gives the final verdict of an appeal. */
export default function AppealDecisionScreen() {
  const router = useRouter();
  const { appealId } = useLocalSearchParams<{ appealId: string }>();
  const appeals = useAppeals();
  const giveVerdict = useGiveVerdict({ kind: "appeal", id: appealId });
  const appeal = appeals.data?.find((candidate) => candidate.id === appealId);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      {appeals.isPending ? <ActivityIndicator /> : null}
      {appeals.isSuccess && !appeal ? <Text>{texts.notFound}</Text> : null}
      {appeal ? (
        <>
          <Text style={styles.title}>{stripInlineFormatting(appeal.post.title)}</Text>
          <Text style={styles.bold}>{texts.original(VERDICT_LABELS[appeal.review.verdict])}</Text>
          <Text>{appeal.review.publicNote}</Text>
          <Text>{texts.reason(appeal.reason)}</Text>
          <Text style={styles.muted}>{texts.final}</Text>
          <VerdictForm
            loading={giveVerdict.isPending}
            error={giveVerdict.error ? reviewErrorMessage(giveVerdict.error) : undefined}
            onSubmit={(input) => giveVerdict.mutate(input, { onSuccess: () => router.back() })}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "bold" },
  bold: { fontWeight: "600" },
  muted: { color: colors.muted },
});
