import { type JuryPublic, Verdict, VERDICT_LABELS } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

/** « Avis d'un jury de 7 lecteurs : faux 4, trompeur 2, exact 1 » (verdicts without votes left out). */
export function juryOpinionText(jury: JuryPublic): string {
  const parts = Verdict.options.flatMap((verdict) => {
    const count = jury.distribution[verdict] ?? 0;
    return count > 0 ? [`${VERDICT_LABELS[verdict]} ${count}`] : [];
  });
  const readers = jury.voters === 1 ? "1 lecteur" : `${jury.voters} lecteurs`;
  return `Avis d'un jury de ${readers} : ${parts.join(", ")}`;
}

const DEADLINE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** « 10 octobre à 14:00 »: when the vote closes. */
export function formatDeadline(isoDate: string): string {
  return DEADLINE_FORMAT.format(new Date(isoDate));
}

export function juryErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "JURY_DEADLINE_PASSED":
        return "Le délai de 48 heures est dépassé : votre place a été donnée à un autre lecteur.";
      case "JURY_ALREADY_VOTED":
        return "Vous avez déjà voté.";
      case "VALIDATION_ERROR":
        return "Choisissez un verdict et indiquez une source.";
      case "FORBIDDEN":
        return "Seuls les lecteurs peuvent être jurés.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
