import { type PostPublic, VERDICT_LABELS } from "@fama/shared";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { SourcesList } from "../../posts/components/SourcesList";
import { formatPublishedAt } from "../../posts/texts";
import { useReview } from "../api";
import { APPEAL_STATE_TEXTS, reviewErrorMessage } from "../texts";
import { juryOpinionText } from "../../jury/texts";
import { EditorReviewActions } from "./EditorReviewActions";
import { colors } from "../../../components/ui/theme";

const texts = {
  why: "Pourquoi ?",
  hide: "Masquer",
  verdict: (label: string, date: string) => `Examiné par la modération : ${label} (${date})`,
  sources: "Sources de la modération",
  reply: "Réponse de l'éditeur",
  disagreement: "Pourquoi le verdict s'écarte de l'avis du jury",
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
        {/* SPEC §5.8: the anonymous opinion of the jury, and why the verdict departs from it. */}
        {data.jury ? <Text style={styles.muted}>{juryOpinionText(data.jury)}</Text> : null}
        {data.juryDisagreement ? (
          <View style={styles.reply}>
            <Text style={styles.heading}>{texts.disagreement}</Text>
            <Text>{data.juryDisagreement}</Text>
          </View>
        ) : null}
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
  link: { color: colors.brand, fontWeight: "600" },
  sheet: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: colors.surface },
  verdict: { fontWeight: "bold" },
  heading: { fontWeight: "600", marginTop: 4 },
  muted: { color: colors.muted, fontStyle: "italic" },
  reply: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: colors.brandTint },
});
