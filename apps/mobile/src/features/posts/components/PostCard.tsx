import type { PostSummaryPublic } from "@fama/shared";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../../lib/apiClient";
import { EditorBadge } from "../../editors/components/EditorBadge";
import { formatCommentCount, formatPublishedAt } from "../texts";
import { ReliabilityBar } from "./ReliabilityBar";

/** A post in the feed: editor and badge, date, title, cover, reliability, comment count. */
export function PostCard({ post }: { post: PostSummaryPublic }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/posts/${post.id}`)}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.editor}>{post.editor.pseudo}</Text>
        <EditorBadge status={post.editor.editorStatus} />
        <Text style={styles.date}>{formatPublishedAt(post.createdAt)}</Text>
      </View>
      <Text style={styles.title}>{post.title}</Text>
      {post.coverImage ? (
        <Image
          source={{ uri: apiClient.url(post.coverImage.path) }}
          style={styles.cover}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Text numberOfLines={3}>{post.summary}</Text>
      <View style={styles.footer}>
        <ReliabilityBar post={post} />
        <Text style={styles.comments}>{formatCommentCount(post.commentCount)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, backgroundColor: "#fff", borderRadius: 8 },
  header: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  editor: { fontWeight: "600" },
  date: { color: "#666", marginLeft: "auto" },
  title: { fontSize: 18, fontWeight: "bold" },
  cover: { width: "100%", aspectRatio: 16 / 9, borderRadius: 6, backgroundColor: "#ddd" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  comments: { color: "#666" },
});
