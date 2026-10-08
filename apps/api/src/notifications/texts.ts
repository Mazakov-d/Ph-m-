import type { Verdict } from "@fama/shared";

// The texts of the push notifications, in French (CLAUDE.md: the interface is in French).
const VERDICT_LABELS: Record<Verdict, string> = {
  ACCURATE: "exact",
  MISSING_CONTEXT: "contexte manquant",
  MISLEADING: "trompeur",
  FALSE: "faux",
  UNVERIFIABLE: "invérifiable",
};

export const NOTIFICATION_TEXTS = {
  commentReply: "Nouvelle réponse à votre commentaire",
  underReview: "Votre article est en cours d'examen",
  verdict: (verdict: Verdict) => `Verdict sur votre article : ${VERDICT_LABELS[verdict]}`,
  ticketMessage: "Nouveau message",
  ticketMessageBody: "Une réponse est arrivée dans votre conversation.",
  juryDuty: "Vous êtes tiré au sort pour un jury",
  juryDutyBody: "Examinez un article et donnez votre avis sous 48 heures.",
};
