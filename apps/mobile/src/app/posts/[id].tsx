import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { CommentsSection } from "../../features/comments/components/CommentsSection";
import { EditorBadge } from "../../features/editors/components/EditorBadge";
import { usePost } from "../../features/posts/api";
import { VoteBar } from "../../features/votes/components/VoteBar";
import { ReliabilityBar } from "../../features/posts/components/ReliabilityBar";
import { ReportButton } from "../../features/reports/components/ReportButton";
import { ReviewPanel } from "../../features/reviews/components/ReviewPanel";
import { SourcesList } from "../../features/posts/components/SourcesList";
import {
  formatPublishedAt,
  postErrorMessage,
  THEME_LABELS,
  ZONE_LABELS,
} from "../../features/posts/texts";
import { apiClient } from "../../lib/apiClient";

const texts = {
  title: "Publication",
  sources: "Sources",
  corrections: "Corrections",
  correctionOf: (date: string) => `Correction du ${date}`,
};

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
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.meta}>
        <Link href={`/editors/${data.editor.id}`} style={styles.editor}>
          {data.editor.pseudo}
        </Link>
        <EditorBadge status={data.editor.editorStatus} />
        <Text style={styles.muted}>{formatPublishedAt(data.createdAt)}</Text>
      </View>
      <Text style={styles.muted}>{`${place} · ${THEME_LABELS[data.theme]}`}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <ReliabilityBar post={data} />
      <ReviewPanel post={data} />
      <Text style={styles.summary}>{data.summary}</Text>
      {data.images.map((image) => (
        <Image
          key={image.id}
          source={{ uri: apiClient.url(image.path) }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      ))}
      <Text style={styles.body}>{data.body}</Text>
      {/* SPEC §7: an opinion is voted on; votes never change any order. */}
      <VoteBar post={data} />
      <Text style={styles.heading}>{texts.sources}</Text>
      <SourcesList sources={data.sources} />
      {data.corrections.length > 0 ? <Text style={styles.heading}>{texts.corrections}</Text> : null}
      {data.corrections.map((correction) => (
        <View key={correction.id} style={styles.correction}>
          <Text style={styles.muted}>
            {texts.correctionOf(formatPublishedAt(correction.createdAt))}
          </Text>
          <Text>{correction.content}</Text>
        </View>
      ))}
      <ReportButton post={data} />
      <CommentsSection post={data} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 32 },
  message: { padding: 24, textAlign: "center" },
  container: { padding: 20, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  editor: { fontWeight: "600", color: "#1d3557" },
  muted: { color: "#666" },
  title: { fontSize: 24, fontWeight: "bold" },
  summary: { fontSize: 17, fontWeight: "600" },
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: 6, backgroundColor: "#ddd" },
  body: { fontSize: 16, lineHeight: 24 },
  heading: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
  correction: { gap: 4, padding: 12, borderRadius: 6, backgroundColor: "#fff3cd" },
});
