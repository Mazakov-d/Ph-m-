import type { PostSummaryPublic } from "@fama/shared";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { FormattedText } from "../../../components/ui/FormattedText";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";
import { EditorBadge } from "../../editors/components/EditorBadge";
import { formatCommentCount, formatPublishedAt } from "../texts";
import { ReliabilityBar } from "./ReliabilityBar";
import { VideoPreview } from "./VideoPreview";

/**
 * A post in the feed: editor and badge, date, then the first three blocks chosen by the editor
 * (interface brief): title, summary, and the video, the cover picture or the start of the article.
 */
export function PostCard({ post, fill = false }: { post: PostSummaryPublic; fill?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/posts/${post.id}`)}
      // In a grid row, the cards of a row share its width and height (`fill`).
      style={({ pressed }) => [styles.card, fill && styles.fill, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.editor}>{post.editor.pseudo}</Text>
        <EditorBadge status={post.editor.editorStatus} />
        <Text style={styles.date}>{formatPublishedAt(post.createdAt)}</Text>
      </View>
      <FormattedText
        text={post.title}
        typeface={post.typefaces.title}
        size={textSizes.cardTitle}
        alwaysBold
        style={styles.title}
      />
      <FormattedText
        text={post.summary}
        typeface={post.typefaces.summary}
        size={textSizes.summary}
        numberOfLines={3}
      />
      {/* The API sends the excerpt only when the article is the third block. */}
      {post.bodyExcerpt !== null ? (
        <FormattedText
          text={post.bodyExcerpt}
          typeface={post.typefaces.body}
          size={textSizes.body}
          style={styles.excerpt}
        />
      ) : post.video ? (
        <VideoPreview video={post.video} />
      ) : post.coverImage ? (
        <Image
          source={{ uri: apiClient.url(post.coverImage.path) }}
          style={styles.cover}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.footer}>
        <ReliabilityBar post={post} />
        <Text style={styles.muted}>{formatCommentCount(post.commentCount)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9 },
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  editor: { fontWeight: "600", color: colors.text },
  date: { color: colors.muted, fontSize: textSizes.meta, marginLeft: "auto" },
  title: { color: colors.text },
  excerpt: { color: colors.text, lineHeight: 22 },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: "auto",
  },
  muted: { color: colors.muted, fontSize: textSizes.meta },
});
