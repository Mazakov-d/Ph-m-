import { ALERTS_MAX, type AlertPublic } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";
import { THEME_LABELS, zonePlaceLabel } from "../posts/texts";

/** « Sport · France », « Politique », « Rennes ». */
export function alertLabel(alert: Pick<AlertPublic, "theme" | "zone" | "locality">): string {
  return [
    alert.theme ? THEME_LABELS[alert.theme] : null,
    alert.zone ? zonePlaceLabel(alert.zone, alert.locality) : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

export function alertErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "ALERTS_LIMIT_REACHED":
        return `Vous avez déjà ${ALERTS_MAX} alertes : supprimez-en une pour en créer une autre.`;
      case "VALIDATION_ERROR":
        return "Choisissez un thème, une zone, ou les deux.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
