import { can, MESSAGE_MAX_LENGTH } from "@fama/shared";
import { useRouter } from "expo-router";
import { TextActionForm } from "../../../components/ui/TextActionForm";
import { useAuth } from "../../../providers/AuthProvider";
import { useOpenEditorChat } from "../api";
import { ticketErrorMessage } from "../texts";

/** SPEC §8: a moderator opens a chat with an editor (e.g. about a report). */
export function ContactEditor({ editorId }: { editorId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const open = useOpenEditorChat();
  if (!can(user, "ticket.assign")) {
    return null;
  }
  return (
    <TextActionForm
      label="Écrire à l'éditeur"
      submitLabel="Envoyer"
      maxLength={MESSAGE_MAX_LENGTH}
      loading={open.isPending}
      error={open.error ? ticketErrorMessage(open.error) : undefined}
      onSubmit={(content, done) =>
        open.mutate(
          { editorId, content },
          {
            onSuccess: (ticket) => {
              done();
              router.push(`/tickets/${ticket.id}`);
            },
          },
        )
      }
    />
  );
}
