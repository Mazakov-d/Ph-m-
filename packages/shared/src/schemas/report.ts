import { z } from "zod";
import { CommentReportReason, PostReportReason, ReportStatus } from "../enums.js";
import { REPORT_DETAILS_MAX_LENGTH } from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

const reportDetailsSchema = z.string().trim().min(1).max(REPORT_DETAILS_MAX_LENGTH).nullable();

// SPEC §5.1: free text mandatory when the reason is OTHER.
function requireDetailsForOther(report: { reason: string; details: string | null }): boolean {
  return report.reason !== "OTHER" || report.details !== null;
}
const DETAILS_REQUIRED = { path: ["details"], message: "Details are required for OTHER" };

// SPEC §5.1
export const createPostReportInputSchema = z
  .object({ reason: PostReportReason, details: reportDetailsSchema })
  .refine(requireDetailsForOther, DETAILS_REQUIRED);
export type CreatePostReportInput = z.infer<typeof createPostReportInputSchema>;

// SPEC §6.2
export const createCommentReportInputSchema = z
  .object({ reason: CommentReportReason, details: reportDetailsSchema })
  .refine(requireDetailsForOther, DETAILS_REQUIRED);
export type CreateCommentReportInput = z.infer<typeof createCommentReportInputSchema>;

/** A report as seen by moderators. The weight is internal (CLAUDE.md §4.3). */
export const reportModerationSchema = z.object({
  id: idSchema,
  reporterId: idSchema,
  reason: z.union([PostReportReason, CommentReportReason]),
  details: z.string().nullable(),
  weight: z.number().nonnegative(),
  status: ReportStatus,
  createdAt: isoDateTimeSchema,
});
export type ReportModeration = z.infer<typeof reportModerationSchema>;
