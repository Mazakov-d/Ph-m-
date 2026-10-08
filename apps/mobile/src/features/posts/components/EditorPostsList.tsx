import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { useEditorPosts } from "../api";
import { postErrorMessage } from "../texts";
import { PostGrid } from "./PostGrid";

const texts = {
  title: "Publications",
  empty: "Aucune publication pour l'instant.",
  more: "Voir plus",
};

/** SPEC §2.2: the publications of an editor's public profile, in a grid like the feed. */
export function EditorPostsList({ editorId }: { editorId: string }) {
  const posts = useEditorPosts(editorId);
  const items = posts.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.list}>
      <Text style={styles.title}>{texts.title}</Text>
      {posts.isPending ? <ActivityIndicator /> : null}
      {posts.error ? <Text>{postErrorMessage(posts.error)}</Text> : null}
      {posts.isSuccess && items.length === 0 ? <Text>{texts.empty}</Text> : null}
      <PostGrid posts={items} />
      {posts.hasNextPage ? (
        <Button
          label={texts.more}
          variant="secondary"
          loading={posts.isFetchingNextPage}
          onPress={() => void posts.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  title: { fontSize: 18, fontWeight: "bold" },
});
