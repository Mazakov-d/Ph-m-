import { can, MESSAGE_MAX_LENGTH } from "@fama/shared";
import { useQueryClient } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { TextActionForm } from "../../../components/ui/TextActionForm";
import { useAuth } from "../../../providers/AuthProvider";
import { ticketKeys, useOpenEditorChat } from "../api";
import { ticketErrorMessage } from "../texts";

const texts = { open: "Envoyer un message à l'éditeur", send: "Envoyer" };

/**
 * SPEC §8: a moderator opens a chat with an editor (e.g. about a report). docs/DECISIONS.md
 * (chats): the chat then shows on the editor's page, next to the profile.
 */
export function ContactEditor({ editorId }: { editorId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const open = useOpenEditorChat();
  if (!can(user, "ticket.assign")) {
    return null;
  }
  return (
    // As wide as its content, not the whole column.
    <View style={styles.compact}>
      <TextActionForm
        label={texts.open}
        submitLabel={texts.send}
        maxLength={MESSAGE_MAX_LENGTH}
        loading={open.isPending}
        error={open.error ? ticketErrorMessage(open.error) : undefined}
        onSubmit={(content, done) =>
          open.mutate(
            { editorId, content },
            {
              onSuccess: () => {
                done();
                void queryClient.invalidateQueries({ queryKey: ticketKeys.editorChat(editorId) });
              },
            },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ compact: { alignSelf: "flex-start", minWidth: 280 } });
