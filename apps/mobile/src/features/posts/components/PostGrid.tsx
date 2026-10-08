import type { PostSummaryPublic } from "@fama/shared";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../../components/ui/theme";
import { useGridColumns } from "../../../components/ui/useGridColumns";
import { PostCard } from "./PostCard";

/**
 * Interface brief: posts in rows of 1 to 3 columns depending on the width of the window, like
 * the feed (for lists that are not a FlatList, such as an editor's page).
 */
export function PostGrid({ posts }: { posts: PostSummaryPublic[] }) {
  const columns = useGridColumns();
  const rows: PostSummaryPublic[][] = [];
  for (let start = 0; start < posts.length; start += columns) {
    rows.push(posts.slice(start, start + columns));
  }
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((post) => post.id).join()} style={styles.row}>
          {row.map((post) => (
            <PostCard key={post.id} post={post} fill />
          ))}
          {/* Empty cells keep the last row's cards as wide as the others. */}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`empty-${index}`} style={styles.empty} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  empty: { flex: 1 },
});
