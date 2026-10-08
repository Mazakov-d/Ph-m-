import { type PostPublic, VERDICT_LABELS } from "@fama/shared";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { SourcesList } from "../../posts/components/SourcesList";
import { formatPublishedAt } from "../../posts/texts";
import { useReview } from "../api";
import { APPEAL_STATE_TEXTS, reviewErrorMessage } from "../texts";
import { EditorReviewActions } from "./EditorReviewActions";

const texts = {
  why: "Pourquoi ?",
  hide: "Masquer",
  verdict: (label: string, date: string) => `Examiné par la modération : ${label} (${date})`,
  sources: "Sources de la modération",
  reply: "Réponse de l'éditeur",
};

/** SPEC §5.6: the « Pourquoi ? » sheet of a reviewed article (verdict, note, sources, reply). */
export function ReviewPanel({ post }: { post: PostPublic }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const review = useReview(post.id, open);
  if (post.kind !== "ARTICLE" || post.reviewStatus !== "REVIEWED") {
    return null;
  }

  const content = () => {
    if (review.isPending) return <ActivityIndicator />;
    if (review.error) return <Text>{reviewErrorMessage(review.error)}</Text>;
    const data = review.data;
    const appealText = APPEAL_STATE_TEXTS[data.appealState];
    return (
      <View style={styles.sheet}>
        <Text style={styles.verdict}>
          {texts.verdict(VERDICT_LABELS[data.verdict], formatPublishedAt(data.createdAt))}
        </Text>
        <Text>{data.publicNote}</Text>
        <Text style={styles.heading}>{texts.sources}</Text>
        <SourcesList sources={data.sources} />
        {appealText ? <Text style={styles.muted}>{appealText}</Text> : null}
        {data.editorReply ? (
          <View style={styles.reply}>
            <Text style={styles.heading}>{texts.reply}</Text>
            <Text>{data.editorReply.content}</Text>
          </View>
        ) : null}
        {user?.id === post.editor.id ? <EditorReviewActions review={data} /> : null}
      </View>
    );
  };

  return (
    <View style={styles.panel}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)}>
        <Text style={styles.link}>{open ? texts.hide : texts.why}</Text>
      </Pressable>
      {open ? content() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8 },
  link: { color: "#1d3557", fontWeight: "600" },
  sheet: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#fff" },
  verdict: { fontWeight: "bold" },
  heading: { fontWeight: "600", marginTop: 4 },
  muted: { color: "#555", fontStyle: "italic" },
  reply: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: "#eef2f8" },
});
