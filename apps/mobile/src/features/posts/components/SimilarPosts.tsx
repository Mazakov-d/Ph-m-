import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, textSizes } from "../../../components/ui/theme";
import { useSimilarPosts } from "../api";
import { PhemeSynthesisBox } from "./PhemeSynthesisBox";
import { PostCard } from "./PostCard";

const texts = {
  others: (count: number) =>
    count === 1 ? "1 autre média en parle" : `${count} autres médias en parlent`,
  show: "Voir les similaires",
  hide: "Masquer les similaires",
};

/**
 * SPEC §9: how many other editors talk about the same subject, and their posts on demand
 * (diversified by owner group and size by the API). Nothing when no one else does.
 */
export function SimilarPosts({ postId }: { postId: string }) {
  const similar = useSimilarPosts(postId);
  const [open, setOpen] = useState(false);
  const count = similar.data?.otherMediaCount ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.count}>{texts.others(count)}</Text>
        <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)}>
          <Text style={styles.link}>{open ? texts.hide : texts.show}</Text>
        </Pressable>
      </View>
      {open ? <PhemeSynthesisBox /> : null}
      {open ? similar.data?.posts.map((post) => <PostCard key={post.id} post={post} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  count: { color: colors.text, fontSize: textSizes.meta, fontWeight: "600" },
  link: { color: colors.brand, fontWeight: "600" },
});
