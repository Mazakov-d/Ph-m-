import { can, type CommentPublic } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { useBlockUser } from "../../users/api";
import { useDeleteComment } from "../api";
import { commentErrorMessage } from "../texts";
import { CommentReportPanel } from "./CommentReportPanel";
import { colors } from "../../../components/ui/theme";

const texts = {
  reply: "Répondre",
  delete: "Supprimer",
  report: "Signaler",
  block: "Bloquer cet utilisateur",
  verified: "✓ Examiné par la modération : conforme aux règles",
  confirmDelete: "Supprimer ce commentaire ? Cette action est définitive.",
  confirmBlock: (pseudo: string) =>
    `Bloquer ${pseudo} ? Vous ne verrez plus ses publications ni ses commentaires.`,
  yes: "Confirmer",
  no: "Annuler",
};

type Pending = "delete" | "block" | "report" | null;
type Props = { comment: CommentPublic; onReply?: () => void };

/** Reply, delete (own), report, block; the badge replaces « Signaler » once VERIFIED (§6.2). */
export function CommentActions({ comment, onReply }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState<Pending>(null);
  const deleteComment = useDeleteComment(comment.postId);
  const blockUser = useBlockUser();
  const isOwn = user?.id === comment.authorId;
  const isShown = comment.status === "VISIBLE" || comment.status === "VERIFIED";
  const canReport =
    !isOwn &&
    can(user, "report.create") &&
    (comment.status === "VISIBLE" || comment.status === "UNDER_REVIEW");
  const canBlock = user !== null && !isOwn && can(user, "user.block");
  const error = deleteComment.error ?? blockUser.error;

  if (pending === "report") {
    return (
      <CommentReportPanel
        commentId={comment.id}
        postId={comment.postId}
        onClose={() => setPending(null)}
      />
    );
  }
  if (pending === "delete" || pending === "block") {
    const confirm = () =>
      pending === "delete"
        ? deleteComment.mutate(comment.id)
        : blockUser.mutate(comment.authorId, { onSuccess: () => setPending(null) });
    return (
      <View style={styles.confirm}>
        <Text>
          {pending === "delete" ? texts.confirmDelete : texts.confirmBlock(comment.authorPseudo)}
        </Text>
        <View style={styles.row}>
          <Action label={texts.yes} onPress={confirm} />
          <Action label={texts.no} onPress={() => setPending(null)} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      {comment.status === "VERIFIED" ? <Text style={styles.badge}>{texts.verified}</Text> : null}
      <View style={styles.row}>
        {onReply && isShown ? <Action label={texts.reply} onPress={onReply} /> : null}
        {isOwn && isShown ? (
          <Action label={texts.delete} onPress={() => setPending("delete")} />
        ) : null}
        {canReport ? <Action label={texts.report} onPress={() => setPending("report")} /> : null}
        {canBlock ? <Action label={texts.block} onPress={() => setPending("block")} /> : null}
      </View>
      {error ? <Text style={styles.error}>{commentErrorMessage(error)}</Text> : null}
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
  wrap: { gap: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  action: { color: colors.brand, fontWeight: "600" },
  badge: { color: colors.success, fontWeight: "600" },
  confirm: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: colors.notice },
  error: { color: colors.danger },
});
