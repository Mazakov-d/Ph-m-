import type {
  MessagePublic,
  TicketKind,
  TicketModeration,
  TicketStatus,
  TicketTopic,
} from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "En attente",
  ASSIGNED: "Pris en charge",
  CLOSED: "Fermé",
};

export const TICKET_KIND_LABELS: Record<TicketKind, string> = {
  SUPPORT: "Support",
  EDITOR_CHAT: "Échange avec un éditeur",
};

// docs/DECISIONS.md (contact): the reasons offered by « Contacter Phémé ».
export const TICKET_TOPIC_LABELS: Record<TicketTopic, string> = {
  PROBLEM: "Un problème à signaler",
  IDEA: "Une idée à proposer",
  EDITOR_ACCOUNT: "Ouvrir un compte éditeur",
  ACCOUNT: "Mon compte ou une sanction",
  OTHER: "Autre chose",
};

export const TICKET_AUDIENCE_LABELS: Record<TicketModeration["audience"], string> = {
  EDITOR: "Éditeur",
  READER: "Lecteur",
};

export function ticketErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "TICKET_ALREADY_ASSIGNED":
        return "Un autre modérateur vient de prendre ce ticket en charge.";
      case "TICKET_CLOSED":
        return "Cette conversation est fermée. Ouvrez un nouveau ticket si besoin.";
      case "NOT_FOUND":
        return "Cette conversation n'existe pas ou ne vous est pas attribuée.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}

/**
 * docs/DECISIONS.md (chats): who wrote a message — « Modo » for a moderator, « Admin » for an
 * admin, the name of anyone else (the editor, the reader).
 */
export function messageAuthorLabel(message: Pick<MessagePublic, "authorRole" | "authorPseudo">) {
  if (message.authorRole === "MODERATOR") return "Modo";
  if (message.authorRole === "ADMIN") return "Admin";
  return message.authorPseudo;
}

/** docs/DECISIONS.md (chats): a chat with an editor opens on the editor's page. */
export function conversationPath(ticket: Pick<TicketModeration, "id" | "kind" | "editorId">) {
  return ticket.kind === "EDITOR_CHAT" && ticket.editorId
    ? `/editors/${ticket.editorId}`
    : `/tickets/${ticket.id}`;
}
