import type { EditorStatus } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// SPEC §2.2: badge shown on profiles and posts.
export const EDITOR_BADGES: Partial<Record<EditorStatus, string>> = {
  INDEPENDENT: "Indépendant",
  CERTIFIED: "Certifié",
};

export const APPLICATION_STATUS_TEXTS: Record<EditorStatus, string> = {
  PENDING: "Votre demande est en cours d'examen par l'équipe de modération.",
  INDEPENDENT: "Vous êtes éditeur indépendant : vous pouvez publier.",
  CERTIFIED: "Vous êtes éditeur certifié : vous pouvez publier.",
  REJECTED: "Votre demande a été refusée. Vous pouvez en envoyer une nouvelle.",
};

/** API errors of the editor flow, in French. */
export function editorErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "INVALID_DOCUMENT":
        return "Un document est invalide : PDF, JPEG ou PNG de 10 Mo maximum.";
      case "INVALID_STATUS_TRANSITION":
        return "Cette demande a déjà été traitée.";
      case "CONFLICT_OF_INTEREST":
        return "Vous ne pouvez pas traiter cette demande (conflit d'intérêts).";
      case "FORBIDDEN":
        return "Vous n'avez pas le droit d'effectuer cette action.";
      case "EDITOR_APPLICATION_EXISTS":
        return "Vous avez déjà une demande en cours.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas faire de demande.";
      case "VALIDATION_ERROR":
        return "Certains champs sont invalides.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
