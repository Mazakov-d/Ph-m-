import { stripInlineFormatting } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { usePost } from "../../../features/posts/api";
import { VerdictForm } from "../../../features/reviews/components/VerdictForm";
import { JuryVotes } from "../../../features/reviews/components/JuryVotes";
import { useGiveVerdict, useReviewQueue } from "../../../features/reviews/moderationApi";
import { reviewErrorMessage } from "../../../features/reviews/texts";
import { CenteredBox } from "../../../components/ui/CenteredBox";

const texts = { title: "Rendre un verdict" };

/** SPEC §5.5: the verdict of an article under review. */
export default function VerdictScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const post = usePost(postId);
  const giveVerdict = useGiveVerdict({ kind: "post", id: postId });
  // SPEC §5.8: the jury of the article, from the review queue.
  const queueItem = useReviewQueue().data?.find((item) => item.post.id === postId);
  const juryVerdicts = queueItem?.jury?.votes.map((vote) => vote.verdict) ?? [];

  return (
    <CenteredBox size="wide">
      <Stack.Screen options={{ title: texts.title }} />
      {post.data ? (
        <>
          <Text style={styles.title}>{stripInlineFormatting(post.data.title)}</Text>
          <Text>{stripInlineFormatting(post.data.summary)}</Text>
        </>
      ) : null}
      {queueItem ? <JuryVotes jury={queueItem.jury} /> : null}
      <VerdictForm
        juryVerdicts={juryVerdicts}
        loading={giveVerdict.isPending}
        error={giveVerdict.error ? reviewErrorMessage(giveVerdict.error) : undefined}
        onSubmit={(input) => giveVerdict.mutate(input, { onSuccess: () => router.back() })}
      />
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold" },
});
