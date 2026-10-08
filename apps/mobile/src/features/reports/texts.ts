import { CommentReportReason, PostReportReason } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// SPEC §5.1: report reasons, in French.
export const POST_REPORT_REASON_LABELS: Record<PostReportReason, string> = {
  DUBIOUS_SOURCE: "Source douteuse",
  OUT_OF_CONTEXT_MEDIA: "Image hors contexte",
  FALSE_INFORMATION: "Information fausse",
  MISLEADING: "Présentation trompeuse",
  OTHER: "Autre",
};

// SPEC §6.2: comment report reasons, in French.
export const COMMENT_REPORT_REASON_LABELS: Record<CommentReportReason, string> = {
  INSULT: "Insulte",
  DISCRIMINATION: "Discrimination",
  HARASSMENT: "Harcèlement",
  SPAM: "Spam",
  OTHER: "Autre",
};

/** Label of a post or comment report reason. */
export function postReportReasonLabel(reason: string): string {
  const post = PostReportReason.safeParse(reason);
  if (post.success) return POST_REPORT_REASON_LABELS[post.data];
  const comment = CommentReportReason.safeParse(reason);
  return comment.success ? COMMENT_REPORT_REASON_LABELS[comment.data] : reason;
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
