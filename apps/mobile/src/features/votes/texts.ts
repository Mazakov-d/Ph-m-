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
