import type { CommentPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { formatPublishedAt } from "../../posts/texts";
import { HIDDEN_COMMENT_TEXTS } from "../texts";
import { CommentActions } from "./CommentActions";
import { colors } from "../../../components/ui/theme";

type Props = { comment: CommentPublic; onReply?: () => void };

export function CommentItem({ comment, onReply }: Props) {
  const hiddenText = HIDDEN_COMMENT_TEXTS[comment.status];
  return (
    <View style={styles.comment}>
      <View style={styles.header}>
        {/* SPEC §2.1: the pseudo is not clickable. */}
        <Text style={styles.pseudo}>{comment.authorPseudo}</Text>
        <Text style={styles.date}>{formatPublishedAt(comment.createdAt)}</Text>
      </View>
      {hiddenText ? (
        <Text style={styles.hidden}>{hiddenText}</Text>
      ) : (
        <Text>{comment.content}</Text>
      )}
      <CommentActions comment={comment} onReply={onReply} />
    </View>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 4 },
  header: { flexDirection: "row", gap: 8 },
  pseudo: { fontWeight: "600" },
  date: { color: colors.muted },
  hidden: { fontStyle: "italic", color: colors.muted },
});
