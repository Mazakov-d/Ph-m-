import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, textSizes } from "../../components/ui/theme";
import { CommentsSection } from "../../features/comments/components/CommentsSection";
import { EditorBadge } from "../../features/editors/components/EditorBadge";
import { usePost } from "../../features/posts/api";
import { PostBlocks } from "../../features/posts/components/PostBlocks";
import { ReliabilityBar } from "../../features/posts/components/ReliabilityBar";
import { SourcesButton } from "../../features/posts/components/SourcesButton";
import {
  formatPublishedAt,
  postErrorMessage,
  THEME_LABELS,
  ZONE_LABELS,
} from "../../features/posts/texts";
import { ReportButton } from "../../features/reports/components/ReportButton";
import { ReviewPanel } from "../../features/reviews/components/ReviewPanel";
import { VoteBar } from "../../features/votes/components/VoteBar";

const texts = {
  title: "Publication",
  corrections: "Corrections",
  correctionOf: (date: string) => `Correction du ${date}`,
};

/** A full post in its frame, with the comments space attached under it (interface brief). */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);

  if (post.isPending || post.error) {
    return (
      <View>
        <Stack.Screen options={{ title: texts.title }} />
        {post.error ? (
          <Text style={styles.message}>{postErrorMessage(post.error)}</Text>
        ) : (
          <ActivityIndicator style={styles.loading} />
        )}
      </View>
    );
  }
  const data = post.data;
  const place = data.region ? `${ZONE_LABELS[data.zone]} · ${data.region}` : ZONE_LABELS[data.zone];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.frame}>
        <View style={styles.meta}>
          <Link href={`/editors/${data.editor.id}`} style={styles.editor}>
            {data.editor.pseudo}
          </Link>
          <EditorBadge status={data.editor.editorStatus} />
          <Text style={styles.muted}>{formatPublishedAt(data.createdAt)}</Text>
        </View>
        <Text style={styles.muted}>{`${place} · ${THEME_LABELS[data.theme]}`}</Text>
        <ReliabilityBar post={data} />
        <ReviewPanel post={data} />
        <PostBlocks post={data} />
        {/* SPEC §7: an opinion is voted on; votes never change any order. */}
        <VoteBar post={data} />
        <View style={styles.actions}>
          <SourcesButton sources={data.sources} />
          <ReportButton post={data} />
        </View>
        {data.corrections.length > 0 ? (
          <Text style={styles.heading}>{texts.corrections}</Text>
        ) : null}
        {data.corrections.map((correction) => (
          <View key={correction.id} style={styles.correction}>
            <Text style={styles.muted}>
              {texts.correctionOf(formatPublishedAt(correction.createdAt))}
            </Text>
            <Text>{correction.content}</Text>
          </View>
        ))}
      </View>
      <View style={styles.comments}>
        <CommentsSection post={data} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 32 },
  message: { padding: spacing.xl, textAlign: "center" },
  screen: { backgroundColor: colors.background },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    // Interface brief: the post takes the whole page.
    width: "100%",
  },
  // The post sits in a frame…
  frame: {
    zIndex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  // …and the comments come out from under it, a little narrower, as its continuation.
  comments: {
    marginHorizontal: spacing.md,
    marginTop: -1,
    padding: spacing.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: colors.commentsBackground,
  },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  editor: { fontWeight: "600", color: colors.brand },
  muted: { color: colors.muted, fontSize: textSizes.meta },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  heading: { fontSize: textSizes.cardTitle, fontWeight: "bold", marginTop: spacing.sm },
  correction: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.notice,
  },
});
