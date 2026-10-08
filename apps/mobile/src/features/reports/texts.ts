import { PostReportReason } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// SPEC §5.1: report reasons, in French.
export const POST_REPORT_REASON_LABELS: Record<PostReportReason, string> = {
  DUBIOUS_SOURCE: "Source douteuse",
  OUT_OF_CONTEXT_MEDIA: "Image hors contexte",
  FALSE_INFORMATION: "Information fausse",
  MISLEADING: "Présentation trompeuse",
  OTHER: "Autre",
};

/** Label of a post report reason (the moderation schema also allows comment reasons). */
export function postReportReasonLabel(reason: string): string {
  const parsed = PostReportReason.safeParse(reason);
  return parsed.success ? POST_REPORT_REASON_LABELS[parsed.data] : reason;
}

export function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "ALREADY_REPORTED":
        return "Vous avez déjà signalé cette publication.";
      case "ALREADY_REVIEWED":
        return "Cet article a déjà été examiné par la modération.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas signaler.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
