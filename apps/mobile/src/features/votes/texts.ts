import { ApiRequestError } from "../../lib/apiClient";

export function formatVoteCount(count: number): string {
  if (count === 0) {
    return "Aucun vote";
  }
  return count === 1 ? "1 vote" : `${count} votes`;
}

/** API errors of the vote bar, in French. */
export function voteErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "VOTE_ALREADY_CAST":
        return "Vous avez déjà voté : votre vote est définitif.";
      case "VOTE_LOCKED_AFTER_REVEAL":
        return "Vous avez vu les résultats : vous ne pouvez plus voter.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas voter.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
