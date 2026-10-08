import type { ReviewPublic } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

export const APPEAL_STATE_TEXTS: Record<ReviewPublic["appealState"], string | null> = {
  NONE: null,
  PENDING: "L'éditeur a fait appel : un autre modérateur réexamine l'article.",
  DECIDED: "Verdict rendu en appel par un autre modérateur.",
};

export function reviewErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "REPLY_WINDOW_CLOSED":
      case "APPEAL_WINDOW_CLOSED":
        return "Le délai de 48 heures après le verdict est dépassé.";
      case "ALREADY_REPLIED":
        return "Vous avez déjà répondu à ce verdict.";
      case "SAME_MODERATOR_APPEAL":
        return "Vous avez rendu le premier verdict : un autre modérateur doit trancher l'appel.";
      case "CONFLICT_OF_INTEREST":
        return "Vous ne pouvez pas traiter ce dossier (conflit d'intérêts).";
      case "INVALID_STATUS_TRANSITION":
        return "Ce dossier a déjà été traité.";
      case "APPEAL_ALREADY_USED":
        return "L'appel a déjà été utilisé pour cette publication.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
