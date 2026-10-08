import * as shared from "@fama/shared";
import * as prisma from "./generated/prisma/enums.js";

// CLAUDE.md §4.3: every Prisma enum carries exactly the values of the Zod enum of `shared`.
const ENUM_PAIRS: Record<string, [Record<string, string>, readonly string[]]> = {
  UserRole: [prisma.UserRole, shared.UserRole.options],
  EditorStatus: [prisma.EditorStatus, shared.EditorStatus.options],
  PostKind: [prisma.PostKind, shared.PostKind.options],
  Zone: [prisma.Zone, shared.Zone.options],
  Locality: [prisma.Locality, shared.Locality.options],
  EditorApplicantType: [prisma.EditorApplicantType, shared.EditorApplicantType.options],
  EditorProof: [prisma.EditorProof, shared.EditorProof.options],
  TicketTopic: [prisma.TicketTopic, shared.TicketTopic.options],
  Theme: [prisma.Theme, shared.Theme.options],
  PostReviewStatus: [prisma.PostReviewStatus, shared.PostReviewStatus.options],
  Verdict: [prisma.Verdict, shared.Verdict.options],
  PostReportReason: [prisma.PostReportReason, shared.PostReportReason.options],
  CommentReportReason: [prisma.CommentReportReason, shared.CommentReportReason.options],
  ReportStatus: [prisma.ReportStatus, shared.ReportStatus.options],
  CommentStatus: [prisma.CommentStatus, shared.CommentStatus.options],
  DeletedBy: [prisma.DeletedBy, shared.DeletedBy.options],
  SanctionType: [prisma.SanctionType, shared.SanctionType.options],
  TicketKind: [prisma.TicketKind, shared.TicketKind.options],
  TicketStatus: [prisma.TicketStatus, shared.TicketStatus.options],
  NotificationKind: [prisma.NotificationKind, shared.NotificationKind.options],
  PushPlatform: [prisma.PushPlatform, shared.PushPlatform.options],
  JuryAssignmentStatus: [prisma.JuryAssignmentStatus, shared.JuryAssignmentStatus.options],
  PostLayout: [prisma.PostLayout, shared.PostLayout.options],
  Typeface: [prisma.Typeface, shared.Typeface.options],
};

describe("Prisma enums ↔ shared Zod enums", () => {
  it("pairs every Prisma enum with a shared enum", () => {
    expect(Object.keys(prisma).sort()).toEqual(Object.keys(ENUM_PAIRS).sort());
  });

  for (const [name, [prismaEnum, zodValues]] of Object.entries(ENUM_PAIRS)) {
    it(`${name} has the same values in the same order`, () => {
      expect(Object.values(prismaEnum)).toEqual(zodValues);
    });
  }
});
