import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { EditorBadge } from "../../editors/components/EditorBadge";
import type { FeedFilters } from "../../posts/api";
import { PostCard } from "../../posts/components/PostCard";
import { postErrorMessage } from "../../posts/texts";
import { useSearch } from "../api";

const texts = {
  editors: "Médias et éditeurs",
  posts: "Publications",
  empty: "Aucun résultat pour cette recherche et ces filtres.",
};

type Props = { q: string; filters: FeedFilters; header: ReactElement };

/** SPEC §4.4: results split between editors and posts. */
export function SearchResults({ q, filters, header }: Props) {
  const router = useRouter();
  const search = useSearch(q, filters);
  const editors = search.data?.editors ?? [];
  const posts = search.data?.posts ?? [];

  return (
    <FlatList
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <PostCard post={item} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {search.isPending ? <ActivityIndicator /> : null}
          {search.error ? (
            <Text style={styles.message}>{postErrorMessage(search.error)}</Text>
          ) : null}
          {editors.length > 0 ? <Text style={styles.heading}>{texts.editors}</Text> : null}
          {editors.map((editor) => (
            <Pressable
              key={editor.id}
              accessibilityRole="link"
              onPress={() => router.push(`/editors/${editor.id}`)}
              style={styles.editor}
            >
              <Text style={styles.pseudo}>{editor.pseudo}</Text>
              <EditorBadge status={editor.editorStatus} />
            </Pressable>
          ))}
          {posts.length > 0 ? <Text style={styles.heading}>{texts.posts}</Text> : null}
          {search.isSuccess && editors.length === 0 && posts.length === 0 ? (
            <Text style={styles.message}>{texts.empty}</Text>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  header: { gap: 8 },
  heading: { fontSize: 16, fontWeight: "bold", marginHorizontal: 16, marginTop: 8 },
  editor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  pseudo: { fontWeight: "600" },
  message: { textAlign: "center", padding: 24 },
});
