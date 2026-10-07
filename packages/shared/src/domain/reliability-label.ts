import type { PostKind, PostReviewStatus, Verdict } from "../enums.js";

// docs/DECISIONS.md: French wording of each verdict.
export const VERDICT_LABELS: Record<Verdict, string> = {
  ACCURATE: "exact",
  MISSING_CONTEXT: "contexte manquant",
  MISLEADING: "trompeur",
  FALSE: "faux",
  UNVERIFIABLE: "invérifiable",
};

export type ReliabilityLabelInput = {
  kind: PostKind;
  reviewStatus: PostReviewStatus;
  reportCount: number;
  verdict: Verdict | null;
};

function formatReportCount(reportCount: number): string {
  return reportCount === 1 ? "1 signalement" : `${reportCount} signalements`;
}

/** SPEC §5.6: text of the reliability bar. Opinions have no bar: returns null. */
export function reliabilityLabel(post: ReliabilityLabelInput): string | null {
  if (post.kind === "OPINION") {
    return null;
  }
  switch (post.reviewStatus) {
    case "NOT_REVIEWED":
      return post.reportCount === 0
        ? "Non examiné"
        : `Non examiné · ${formatReportCount(post.reportCount)}`;
    case "UNDER_REVIEW":
      return `${formatReportCount(post.reportCount)} · en cours d'examen`;
    case "REVIEWED":
      if (post.verdict === null) {
        throw new Error("A REVIEWED post must have a verdict");
      }
      return `${formatReportCount(post.reportCount)} · examiné : ${VERDICT_LABELS[post.verdict]}`;
  }
}
