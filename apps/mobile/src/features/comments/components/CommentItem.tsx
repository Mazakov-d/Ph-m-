import type { CommentPublic } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { formatPublishedAt } from "../../posts/texts";
import { useDeleteComment } from "../api";
import { commentErrorMessage, HIDDEN_COMMENT_TEXTS } from "../texts";

const texts = {
  reply: "Répondre",
  delete: "Supprimer",
  confirm: "Supprimer ce commentaire ? Cette action est définitive.",
  confirmYes: "Oui, supprimer",
  confirmNo: "Annuler",
};

type Props = { comment: CommentPublic; onReply?: () => void };

export function CommentItem({ comment, onReply }: Props) {
  const { user } = useAuth();
  const deleteComment = useDeleteComment(comment.postId);
  const [confirming, setConfirming] = useState(false);
  const hiddenText = HIDDEN_COMMENT_TEXTS[comment.status];
  // docs/DECISIONS.md: the author deletes a comment shown to everyone, never one under review.
  const canDelete =
    user?.id === comment.authorId &&
    (comment.status === "VISIBLE" || comment.status === "VERIFIED");

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
      {confirming ? (
        <View style={styles.confirm}>
          <Text>{texts.confirm}</Text>
          <View style={styles.actions}>
            <Action label={texts.confirmYes} onPress={() => deleteComment.mutate(comment.id)} />
            <Action label={texts.confirmNo} onPress={() => setConfirming(false)} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {onReply && !hiddenText ? <Action label={texts.reply} onPress={onReply} /> : null}
          {canDelete ? <Action label={texts.delete} onPress={() => setConfirming(true)} /> : null}
        </View>
      )}
      {deleteComment.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {commentErrorMessage(deleteComment.error)}
        </Text>
      ) : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.action}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 4 },
  header: { flexDirection: "row", gap: 8 },
  pseudo: { fontWeight: "600" },
  date: { color: "#666" },
  hidden: { fontStyle: "italic", color: "#666" },
  confirm: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: "#fff3cd" },
  actions: { flexDirection: "row", gap: 16 },
  action: { color: "#1d3557", fontWeight: "600" },
  error: { color: "#c1121f" },
});
