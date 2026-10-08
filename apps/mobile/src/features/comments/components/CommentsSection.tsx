import { can, type PostPublic } from "@fama/shared";
import { Link } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, textSizes, spacing } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { formatCommentCount } from "../../posts/texts";
import { useComments } from "../api";
import { commentErrorMessage } from "../texts";
import { CommentForm } from "./CommentForm";
import { CommentThread } from "./CommentThread";

const texts = {
  title: "Commentaires",
  disabled: "Les commentaires sont désactivés pour cet article.",
  signIn: "Connectez-vous pour commenter.",
  restricted: "Votre compte est suspendu : vous pouvez lire mais pas commenter.",
  more: "Voir plus de commentaires",
};

export function CommentsSection({ post }: { post: PostPublic }) {
  const { user } = useAuth();
  const comments = useComments(post.id);
  const threads = comments.data?.pages.flatMap((page) => page.items) ?? [];
  // SPEC §2.5: the API checks again; this only decides what to show.
  const canComment = post.commentsEnabled && can(user, "comment.create");

  const formOrNotice = () => {
    if (!post.commentsEnabled) return <Text style={styles.notice}>{texts.disabled}</Text>;
    if (!user)
      return (
        <Link href="/login" style={styles.link}>
          {texts.signIn}
        </Link>
      );
    if (!canComment) return <Text style={styles.notice}>{texts.restricted}</Text>;
    return <CommentForm postId={post.id} parentId={null} />;
  };

  return (
    <View style={styles.section}>
      <Text
        style={styles.title}
      >{`${texts.title} · ${formatCommentCount(post.commentCount)}`}</Text>
      {comments.isPending ? <ActivityIndicator /> : null}
      {comments.error ? <Text>{commentErrorMessage(comments.error)}</Text> : null}
      {threads.map((thread) => (
        <CommentThread key={thread.id} thread={thread} canComment={canComment} />
      ))}
      {comments.hasNextPage ? (
        <Button
          label={texts.more}
          variant="secondary"
          loading={comments.isFetchingNextPage}
          onPress={() => void comments.fetchNextPage()}
        />
      ) : null}
      {/* Interface brief: the text zone comes at the bottom of the comments. */}
      {formOrNotice()}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  title: { fontSize: textSizes.cardTitle, fontWeight: "bold", color: colors.text },
  notice: { color: colors.muted },
  link: { color: colors.brand, fontWeight: "600" },
});
