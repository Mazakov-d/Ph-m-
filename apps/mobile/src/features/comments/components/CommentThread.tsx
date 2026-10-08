import type { CommentThreadPublic } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

type Props = { thread: CommentThreadPublic; canComment: boolean };

/** SPEC §6: a root comment and its replies (one level); replying to a reply answers the thread. */
export function CommentThread({ thread, canComment }: Props) {
  const [isReplying, setIsReplying] = useState(false);
  const reply = canComment ? () => setIsReplying(true) : undefined;

  return (
    <View style={styles.thread}>
      <CommentItem comment={thread} onReply={reply} />
      <View style={styles.replies}>
        {thread.replies.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onReply={reply} />
        ))}
        {isReplying ? (
          <CommentForm
            postId={thread.postId}
            parentId={thread.id}
            onDone={() => setIsReplying(false)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: 8 },
  replies: { gap: 8, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: "#ddd" },
});
