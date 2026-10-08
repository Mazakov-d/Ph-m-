import { type ReviewQueueItemModeration, stripInlineFormatting } from "@fama/shared";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { postReportReasonLabel } from "../../reports/texts";
import { formatPublishedAt } from "../../posts/texts";
import { colors } from "../../../components/ui/theme";

const texts = {
  meta: (editor: string, score: number, views: number) =>
    `${editor} · score ${score.toFixed(1)} · ${views} lecteurs`,
  priority: (priority: number) => `Priorité ${priority.toFixed(1)}`,
  read: "Lire l'article",
  decide: "Rendre un verdict",
};

/** SPEC §5.4: an article under review, with its reports. */
export function ReviewQueueCard({ item }: { item: ReviewQueueItemModeration }) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <Text style={styles.priority}>{texts.priority(item.priority)}</Text>
      <Text style={styles.title}>{stripInlineFormatting(item.post.title)}</Text>
      <Text style={styles.muted}>
        {texts.meta(item.post.editor.pseudo, item.score, item.viewCount)}
      </Text>
      {item.reports.map((report) => (
        <Text key={report.id}>
          {`• ${postReportReasonLabel(report.reason)}`}
          {report.details ? ` : ${report.details}` : ""}
          {` (${formatPublishedAt(report.createdAt)})`}
        </Text>
      ))}
      <Button
        label={texts.read}
        variant="secondary"
        onPress={() => router.push(`/posts/${item.post.id}`)}
      />
      <Button
        label={texts.decide}
        onPress={() => router.push(`/moderation/post-reviews/${item.post.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 16, borderRadius: 8, backgroundColor: colors.surface },
  priority: { color: colors.danger, fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "bold" },
  muted: { color: colors.muted },
});
