import type { ReportModeration, ReviewPublic } from "@fama/shared";
import type { CommentReport, EditorReply, PostReport, Review } from "../generated/prisma/client.js";

export type ReviewRecord = Review & { editorReply: EditorReply | null };

/** SPEC §5.6: content of the « Pourquoi ? » sheet. */
export function toReviewPublic(
  review: ReviewRecord,
  appealState: ReviewPublic["appealState"],
): ReviewPublic {
  return {
    id: review.id,
    postId: review.postId,
    verdict: review.verdict,
    publicNote: review.publicNote,
    sources: review.sources,
    createdAt: review.createdAt.toISOString(),
    editorReply: review.editorReply
      ? {
          content: review.editorReply.content,
          createdAt: review.editorReply.createdAt.toISOString(),
        }
      : null,
    appealState,
  };
}

/** A post or comment report, as seen by moderators (the fields both kinds share). */
type AnyReport = Pick<
  PostReport,
  "id" | "reporterId" | "details" | "weight" | "status" | "createdAt"
> & {
  reason: PostReport["reason"] | CommentReport["reason"];
};

export function toReportModeration(report: AnyReport): ReportModeration {
  return {
    id: report.id,
    reporterId: report.reporterId,
    reason: report.reason,
    details: report.details,
    weight: report.weight,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}
