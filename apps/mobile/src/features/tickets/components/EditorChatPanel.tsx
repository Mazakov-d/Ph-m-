import { can } from "@fama/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { useEditorChat } from "../api";
import { ticketErrorMessage } from "../texts";
import { ContactEditor } from "./ContactEditor";
import { Conversation } from "./Conversation";

const texts = {
  title: (pseudo: string) => `Conversation avec ${pseudo}`,
  audited:
    "En tant que dirigeant, votre lecture de cette conversation est enregistrée dans le journal d'audit.",
};

/**
 * docs/DECISIONS.md (chats): on an editor's page, the open chat with them — for an ADMIN or the
 * moderator who has it in charge — or the button to write to them.
 */
export function EditorChatPanel({ editorId, pseudo }: { editorId: string; pseudo: string }) {
  const { user } = useAuth();
  const staff = can(user, "ticket.assign");
  const chat = useEditorChat(editorId, staff);
  if (!staff) return null;
  if (chat.isPending) return <ActivityIndicator />;
  if (chat.error) return <Text style={styles.error}>{ticketErrorMessage(chat.error)}</Text>;
  const ticket = chat.data.ticket;
  if (!ticket) return <ContactEditor editorId={editorId} />;
  const audited = can(user, "chat.readAll") && ticket.assignedModeratorId !== user?.id;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{texts.title(pseudo)}</Text>
      {/* SPEC §2.4: an admin's reading is audited (the API records it). */}
      {audited ? <Text style={styles.notice}>{texts.audited}</Text> : null}
      <Conversation ticketId={ticket.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { fontWeight: "bold", color: colors.text },
  notice: { color: colors.muted, fontStyle: "italic" },
  error: { color: colors.danger },
});
