// Enums shared by the API, the app and Prisma. Prisma enums must carry exactly the same values
// (checked by apps/api enums.consistency.spec.ts).
import { z } from "zod";

// SPEC §2
export const UserRole = z.enum(["READER", "EDITOR", "MODERATOR", "ADMIN"]);
export type UserRole = z.infer<typeof UserRole>;

// SPEC §2.2
export const EditorStatus = z.enum(["PENDING", "INDEPENDENT", "CERTIFIED", "REJECTED"]);
export type EditorStatus = z.infer<typeof EditorStatus>;

// SPEC §3
export const PostKind = z.enum(["ARTICLE", "OPINION"]);
export type PostKind = z.infer<typeof PostKind>;

export const Zone = z.enum(["FRANCE", "EUROPE", "INTERNATIONAL", "LOCAL"]);
export type Zone = z.infer<typeof Zone>;

export const Theme = z.enum([
  "POLITICS",
  "ECONOMY",
  "SOCIAL_MOVEMENTS",
  "ENVIRONMENT",
  "SCIENCE_HEALTH",
  "TECH",
  "CULTURE",
  "SPORT",
  // docs/DECISIONS.md (interface brief): a subject outside the list above.
  "OTHER",
]);
export type Theme = z.infer<typeof Theme>;

// docs/DECISIONS.md (interface brief): order of the blocks after the title and the summary.
// TEXT_FIRST: article, then pictures; MEDIA_FIRST: pictures, then article.
export const PostLayout = z.enum(["TEXT_FIRST", "MEDIA_FIRST"]);
export type PostLayout = z.infer<typeof PostLayout>;

// docs/DECISIONS.md (interface brief): typeface chosen by the editor for each text block
// (sizes are fixed by the app). The app bundles one font for each (docs/DECISIONS.md).
export const Typeface = z.enum(["SANS", "SERIF", "MONO", "DISPLAY", "BOOK"]);
export type Typeface = z.infer<typeof Typeface>;

// SPEC §5.3
export const PostReviewStatus = z.enum(["NOT_REVIEWED", "UNDER_REVIEW", "REVIEWED"]);
export type PostReviewStatus = z.infer<typeof PostReviewStatus>;

// SPEC §5.5
export const Verdict = z.enum([
  "ACCURATE",
  "MISSING_CONTEXT",
  "MISLEADING",
  "FALSE",
  "UNVERIFIABLE",
]);
export type Verdict = z.infer<typeof Verdict>;

// SPEC §5.1
export const PostReportReason = z.enum([
  "DUBIOUS_SOURCE",
  "OUT_OF_CONTEXT_MEDIA",
  "FALSE_INFORMATION",
  "MISLEADING",
  "OTHER",
]);
export type PostReportReason = z.infer<typeof PostReportReason>;

// SPEC §6.2
export const CommentReportReason = z.enum([
  "INSULT",
  "DISCRIMINATION",
  "HARASSMENT",
  "SPAM",
  "OTHER",
]);
export type CommentReportReason = z.infer<typeof CommentReportReason>;

// SPEC §5.5
export const ReportStatus = z.enum(["PENDING", "UPHELD", "DISMISSED"]);
export type ReportStatus = z.infer<typeof ReportStatus>;

// SPEC §6.1
export const CommentStatus = z.enum(["VISIBLE", "UNDER_REVIEW", "VERIFIED", "REMOVED", "DELETED"]);
export type CommentStatus = z.infer<typeof CommentStatus>;

// SPEC §6
export const DeletedBy = z.enum(["AUTHOR", "MODERATOR"]);
export type DeletedBy = z.infer<typeof DeletedBy>;

// SPEC §6.3, in escalation order.
export const SanctionType = z.enum(["WARNING", "SUSPENSION_24H", "SUSPENSION_7D", "PERMANENT_BAN"]);
export type SanctionType = z.infer<typeof SanctionType>;

// SPEC §8
export const TicketKind = z.enum(["SUPPORT", "EDITOR_CHAT"]);
export type TicketKind = z.infer<typeof TicketKind>;

export const TicketStatus = z.enum(["NEW", "ASSIGNED", "CLOSED"]);
export type TicketStatus = z.infer<typeof TicketStatus>;
