import type { CommentPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import { colors } from "../../../components/ui/theme";
import { formatPublishedAt } from "../../posts/texts";
import { HIDDEN_COMMENT_TEXTS } from "../texts";
import { useCommentActions } from "./useCommentActions";

const texts = {
  menu: (pseudo: string) => `Actions sur le commentaire de ${pseudo}`,
  verified: "✓ Examiné par la modération : conforme aux règles",
};

type Props = { comment: CommentPublic; onReply?: () => void };

export function CommentItem({ comment, onReply }: Props) {
  const hiddenText = HIDDEN_COMMENT_TEXTS[comment.status];
  const { actions, panel } = useCommentActions(comment, onReply);
  return (
    <View style={styles.comment}>
      <View style={styles.header}>
        {/* SPEC §2.1: the pseudo is not clickable. */}
        <Text style={styles.pseudo}>{comment.authorPseudo}</Text>
        <Text style={styles.date}>{formatPublishedAt(comment.createdAt)}</Text>
        <ActionMenu accessibilityLabel={texts.menu(comment.authorPseudo)} actions={actions} />
      </View>
      {hiddenText ? (
        <Text style={styles.hidden}>{hiddenText}</Text>
      ) : (
        <Text>{comment.content}</Text>
      )}
      {/* SPEC §6.2: the badge replaces « Signaler » once the moderation checked the comment. */}
      {comment.status === "VERIFIED" ? <Text style={styles.badge}>{texts.verified}</Text> : null}
      {panel}
    </View>
  );
}

const styles = StyleSheet.create({
  comment: { gap: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  pseudo: { fontWeight: "600" },
  date: { color: colors.muted },
  hidden: { fontStyle: "italic", color: colors.muted },
  badge: { color: colors.success, fontWeight: "600" },
});
