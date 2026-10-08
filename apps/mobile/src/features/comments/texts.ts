import type { CommentStatus } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

/** SPEC §6 and §6.2: what replaces the content of a hidden comment. */
export const HIDDEN_COMMENT_TEXTS: Partial<Record<CommentStatus, string>> = {
  DELETED: "Commentaire supprimé",
  REMOVED: "Commentaire supprimé",
  UNDER_REVIEW: "Commentaire en cours d'examen par la modération",
};

/** API errors of the comments section, in French. */
export function commentErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      // docs/DECISIONS.md: generic, never the term found.
      case "TOXIC_CONTENT":
        return "Votre commentaire contient un terme interdit par les règles de la communauté. Reformulez-le.";
      case "COMMENTS_DISABLED":
        return "Les commentaires sont désactivés pour cet article.";
      case "INVALID_PARENT_COMMENT":
        return "Ce commentaire ne peut plus recevoir de réponse.";
      case "COMMENT_UNDER_REVIEW":
        return "Ce commentaire est en cours d'examen : il ne peut pas être supprimé.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas commenter.";
      case "RATE_LIMITED":
        return "Trop d'envois en peu de temps. Patientez un moment avant de réessayer.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
