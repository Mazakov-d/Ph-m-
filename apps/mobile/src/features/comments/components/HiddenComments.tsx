import type { PostPublic } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../../components/ui/theme";
import { Button } from "../../../components/ui/Button";
import { CommentsSection } from "./CommentsSection";

const texts = {
  show: (count: number) => `Afficher les commentaires (${count})`,
  hide: "Masquer les commentaires",
  disabled: "Les commentaires sont désactivés pour cet article.",
};

/**
 * docs/DECISIONS.md (comments hidden): under a post, the comments stay folded until the reader
 * asks for them (they are only loaded then).
 */
export function HiddenComments({ post }: { post: PostPublic }) {
  const [shown, setShown] = useState(false);
  // Nothing to unfold: the reader only learns that the comments are off.
  if (!post.commentsEnabled) return <Text style={styles.disabled}>{texts.disabled}</Text>;
  return (
    <>
      <Button
        label={shown ? texts.hide : texts.show(post.commentCount)}
        variant="secondary"
        expanded={shown}
        onPress={() => setShown(!shown)}
      />
      {shown ? <CommentsSection post={post} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  disabled: { color: colors.muted, fontStyle: "italic", textAlign: "center" },
});
