import { can } from "@fama/shared";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chip } from "../../components/ui/Chip";
import {
  useCommentQueue,
  useOpinionQueue,
  useSanctionAppeals,
} from "../../features/moderation/api";
import {
  CommentModerationCard,
  OpinionModerationCard,
  SanctionAppealCard,
} from "../../features/moderation/components/ModerationCards";
import { useAuth } from "../../providers/AuthProvider";

const texts = {
  title: "Commentaires et opinions signalés",
  forbidden: "Cet écran est réservé à l'équipe de modération.",
  comments: "Commentaires",
  opinions: "Opinions",
  appeals: "Contestations",
  empty: "Rien à traiter.",
};

type Tab = "comments" | "opinions" | "appeals";

/** SPEC §6.2 and §6.3: comments under review, reported opinions and sanction appeals. */
export default function ContentModerationScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("comments");
  const comments = useCommentQueue();
  const opinions = useOpinionQueue();
  const appeals = useSanctionAppeals();
  if (!can(user, "moderation.queue.read")) {
    return <Text style={styles.message}>{texts.forbidden}</Text>;
  }
  const current = { comments, opinions, appeals }[tab];
  const count = (data: unknown[] | undefined) => (data ? `(${data.length})` : "");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.tabs}>
        <Chip
          label={`${texts.comments} ${count(comments.data)}`}
          selected={tab === "comments"}
          onPress={() => setTab("comments")}
        />
        <Chip
          label={`${texts.opinions} ${count(opinions.data)}`}
          selected={tab === "opinions"}
          onPress={() => setTab("opinions")}
        />
        <Chip
          label={`${texts.appeals} ${count(appeals.data)}`}
          selected={tab === "appeals"}
          onPress={() => setTab("appeals")}
        />
      </View>
      {current.isPending ? <ActivityIndicator /> : null}
      {current.data?.length === 0 ? <Text style={styles.message}>{texts.empty}</Text> : null}
      {tab === "comments"
        ? comments.data?.map((comment) => (
            <CommentModerationCard key={comment.id} comment={comment} />
          ))
        : null}
      {tab === "opinions"
        ? opinions.data?.map((item) => <OpinionModerationCard key={item.post.id} item={item} />)
        : null}
      {tab === "appeals"
        ? appeals.data?.map((appeal) => <SanctionAppealCard key={appeal.id} appeal={appeal} />)
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  message: { padding: 24, textAlign: "center" },
});
