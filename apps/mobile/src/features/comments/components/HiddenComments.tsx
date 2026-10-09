import type { PostPublic } from "@fama/shared";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { CommentsSection } from "./CommentsSection";

const texts = {
  show: (count: number) => `Afficher les commentaires (${count})`,
  hide: "Masquer les commentaires",
};

/**
 * docs/DECISIONS.md (comments hidden): under a post, the comments stay folded until the reader
 * asks for them (they are only loaded then).
 */
export function HiddenComments({ post }: { post: PostPublic }) {
  const [shown, setShown] = useState(false);
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
