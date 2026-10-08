import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";
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

type Props = { q: string; filters: FeedFilters; header: ReactElement; columns: number };

/** SPEC §4.4: results split between editors and posts. */
export function SearchResults({ q, filters, header, columns }: Props) {
  const router = useRouter();
  const search = useSearch(q, filters);
  const editors = search.data?.editors ?? [];
  const posts = search.data?.posts ?? [];

  return (
    <FlatList
      // Interface brief: several columns on a wide screen (a new list when the count changes).
      key={columns}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <PostCard post={item} fill={columns > 1} />}
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
  list: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: "100%",
  },
  row: { gap: spacing.md },
  header: { gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: "bold", marginTop: spacing.sm },
  editor: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pseudo: { fontWeight: "600" },
  message: { textAlign: "center", padding: spacing.xl },
});
