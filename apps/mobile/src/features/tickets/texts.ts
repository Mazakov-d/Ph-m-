import type { TicketKind, TicketStatus } from "@fama/shared";
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
