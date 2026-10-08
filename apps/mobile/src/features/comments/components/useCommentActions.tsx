import { can, type CommentPublic } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MenuAction } from "../../../components/ui/ActionMenu";
import { colors } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { useBlockUser } from "../../users/api";
import { useDeleteComment } from "../api";
import { commentErrorMessage } from "../texts";
import { CommentReportPanel } from "./CommentReportPanel";

const texts = {
  reply: "Répondre",
  delete: "Supprimer",
  report: "Signaler",
  block: "Bloquer cet utilisateur",
  confirmDelete: "Supprimer ce commentaire ? Cette action est définitive.",
  confirmBlock: (pseudo: string) =>
    `Bloquer ${pseudo} ? Vous ne verrez plus ses publications ni ses commentaires.`,
  yes: "Confirmer",
  no: "Annuler",
};

type Pending = "delete" | "block" | "report" | null;

/**
 * Reply, delete (own), report, block (SPEC §6, §10), offered in the « ⋯ » menu of a comment
 * (interface brief). Returns the menu entries and the panel of the action being confirmed.
 */
export function useCommentActions(comment: CommentPublic, onReply?: () => void) {
  const { user } = useAuth();
  const [pending, setPending] = useState<Pending>(null);
  const deleteComment = useDeleteComment(comment.postId);
  const blockUser = useBlockUser();
  const isOwn = user?.id === comment.authorId;
  const isShown = comment.status === "VISIBLE" || comment.status === "VERIFIED";
  // SPEC §6.2: a verified comment can no longer be reported (its badge shows instead).
  const canReport =
    !isOwn &&
    can(user, "report.create") &&
    (comment.status === "VISIBLE" || comment.status === "UNDER_REVIEW");
  const canBlock = user !== null && !isOwn && can(user, "user.block");

  const actions: MenuAction[] = [];
  if (onReply && isShown) actions.push({ label: texts.reply, onPress: onReply });
  if (isOwn && isShown) actions.push({ label: texts.delete, onPress: () => setPending("delete") });
  if (canReport) actions.push({ label: texts.report, onPress: () => setPending("report") });
  if (canBlock) actions.push({ label: texts.block, onPress: () => setPending("block") });

  const close = () => setPending(null);
  const error = deleteComment.error ?? blockUser.error;
  const panel =
    pending === "report" ? (
      <CommentReportPanel commentId={comment.id} postId={comment.postId} onClose={close} />
    ) : pending !== null ? (
      <Confirmation
        message={
          pending === "delete" ? texts.confirmDelete : texts.confirmBlock(comment.authorPseudo)
        }
        onConfirm={() =>
          pending === "delete"
            ? deleteComment.mutate(comment.id)
            : blockUser.mutate(comment.authorId, { onSuccess: close })
        }
        onCancel={close}
      />
    ) : error ? (
      <Text style={styles.error}>{commentErrorMessage(error)}</Text>
    ) : null;

  return { actions, panel };
}

type ConfirmationProps = { message: string; onConfirm: () => void; onCancel: () => void };

function Confirmation({ message, onConfirm, onCancel }: ConfirmationProps) {
  return (
    <View style={styles.confirm}>
      <Text>{message}</Text>
      <View style={styles.row}>
        <Action label={texts.yes} onPress={onConfirm} />
        <Action label={texts.no} onPress={onCancel} />
      </View>
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  action: { color: colors.brand, fontWeight: "600" },
  confirm: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: colors.notice },
  error: { color: colors.danger },
});
