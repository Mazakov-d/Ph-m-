import { can } from "@fama/shared";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { AppealCard } from "../../../features/reviews/components/AppealCard";
import { ReviewQueueCard } from "../../../features/reviews/components/ReviewQueueCard";
import { useAppeals, useReviewQueue } from "../../../features/reviews/moderationApi";
import { reviewErrorMessage } from "../../../features/reviews/texts";
import { useAuth } from "../../../providers/AuthProvider";
import { CenteredBox } from "../../../components/ui/CenteredBox";

const texts = {
  title: "Articles signalés",
  forbidden: "Cet écran est réservé à l'équipe de modération.",
  queue: "À examiner",
  appeals: "Appels",
  emptyQueue: "Aucun article en attente d'examen.",
  emptyAppeals: "Aucun appel en attente.",
};

/** SPEC §5.4 and §5.5: the review queue and the appeals, for moderators. */
export default function PostReviewsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"queue" | "appeals">("queue");
  const queue = useReviewQueue();
  const appeals = useAppeals();
  if (!can(user, "moderation.queue.read")) {
    return <Text style={styles.message}>{texts.forbidden}</Text>;
  }
  const current = tab === "queue" ? queue : appeals;

  return (
    <CenteredBox size="wide">
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.tabs}>
        <Chip
          label={`${texts.queue} (${queue.data?.length ?? "…"})`}
          selected={tab === "queue"}
          onPress={() => setTab("queue")}
        />
        <Chip
          label={`${texts.appeals} (${appeals.data?.length ?? "…"})`}
          selected={tab === "appeals"}
          onPress={() => setTab("appeals")}
        />
      </View>
      {current.isPending ? <ActivityIndicator /> : null}
      {current.error ? <Text>{reviewErrorMessage(current.error)}</Text> : null}
      {tab === "queue"
        ? queue.data?.map((item) => <ReviewQueueCard key={item.post.id} item={item} />)
        : appeals.data?.map((appeal) => <AppealCard key={appeal.id} appeal={appeal} />)}
      {current.data?.length === 0 ? (
        <Text style={styles.message}>
          {tab === "queue" ? texts.emptyQueue : texts.emptyAppeals}
        </Text>
      ) : null}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8 },
  message: { padding: 24, textAlign: "center" },
});
