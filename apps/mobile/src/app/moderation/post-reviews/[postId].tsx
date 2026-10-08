import { stripInlineFormatting } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { usePost } from "../../../features/posts/api";
import { VerdictForm } from "../../../features/reviews/components/VerdictForm";
import { useGiveVerdict } from "../../../features/reviews/moderationApi";
import { reviewErrorMessage } from "../../../features/reviews/texts";

const texts = { title: "Rendre un verdict" };

/** SPEC §5.5: the verdict of an article under review. */
export default function VerdictScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const post = usePost(postId);
  const giveVerdict = useGiveVerdict({ kind: "post", id: postId });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      {post.data ? (
        <>
          <Text style={styles.title}>{stripInlineFormatting(post.data.title)}</Text>
          <Text>{stripInlineFormatting(post.data.summary)}</Text>
        </>
      ) : null}
      <VerdictForm
        loading={giveVerdict.isPending}
        error={giveVerdict.error ? reviewErrorMessage(giveVerdict.error) : undefined}
        onSubmit={(input) => giveVerdict.mutate(input, { onSuccess: () => router.back() })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "bold" },
});
