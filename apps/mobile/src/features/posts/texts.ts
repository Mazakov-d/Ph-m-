import type { Theme, Zone } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// docs/DECISIONS.md: French labels of the zones and themes (SPEC §3).
export const ZONE_LABELS: Record<Zone, string> = {
  FRANCE: "France",
  EUROPE: "Europe",
  INTERNATIONAL: "International",
  LOCAL: "Local",
};

export const THEME_LABELS: Record<Theme, string> = {
  POLITICS: "Politique",
  ECONOMY: "Économie",
  SOCIAL_MOVEMENTS: "Mouvements sociaux",
  ENVIRONMENT: "Environnement",
  SCIENCE_HEALTH: "Sciences et santé",
  TECH: "Tech",
  CULTURE: "Culture",
  SPORT: "Sport",
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** « à l'instant », « il y a 5 min », « il y a 3 h », then « 7 oct., 14:30 ». */
export function formatPublishedAt(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) {
    return "à l'instant";
  }
  if (elapsed < HOUR) {
    return `il y a ${Math.floor(elapsed / MINUTE)} min`;
  }
  if (elapsed < DAY) {
    return `il y a ${Math.floor(elapsed / HOUR)} h`;
  }
  return DATE_FORMAT.format(date);
}

export function formatCommentCount(count: number): string {
  if (count === 0) {
    return "Aucun commentaire";
  }
  return count === 1 ? "1 commentaire" : `${count} commentaires`;
}

/** API errors of the posts screens, in French. */
export function postErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "NOT_FOUND":
        return "Cette publication n'existe pas.";
      case "POST_REMOVED":
        return "Cette publication a été retirée par la modération.";
      case "INVALID_IMAGE":
        return "Une image est invalide : JPEG, PNG ou WebP uniquement.";
      case "FILE_TOO_LARGE":
        return "Une image dépasse 5 Mo.";
      case "FORBIDDEN":
        return "Seuls les éditeurs validés peuvent publier.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas publier.";
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
