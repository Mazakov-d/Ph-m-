import type { SanctionPublic, SanctionType } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// SPEC §6.3: sanctions, in French.
export const SANCTION_LABELS: Record<SanctionType, string> = {
  WARNING: "Avertissement",
  SUSPENSION_24H: "Suspension de 24 heures",
  SUSPENSION_7D: "Suspension de 7 jours",
  PERMANENT_BAN: "Bannissement définitif",
};

export const SANCTION_APPEAL_TEXTS: Record<SanctionPublic["appealState"], string | null> = {
  NONE: null,
  PENDING: "Contestation en cours d'examen par un autre modérateur.",
  ACCEPTED: "Contestation acceptée : la sanction est levée.",
  REJECTED: "Contestation rejetée : la sanction est maintenue.",
};

export function sanctionErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "APPEAL_ALREADY_USED":
        return "Cette sanction a déjà été contestée.";
      case "SAME_MODERATOR_APPEAL":
        return "Vous avez prononcé cette sanction : un autre modérateur doit trancher.";
      case "CONFLICT_OF_INTEREST":
        return "Vous ne pouvez pas traiter ce dossier (conflit d'intérêts).";
      case "INVALID_STATUS_TRANSITION":
        return "Ce dossier a déjà été traité.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
