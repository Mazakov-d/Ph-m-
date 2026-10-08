import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CommentDecisionInput,
  CommentModeration,
  ModerationDecisionResult,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { excludedAuthorIds } from "../common/moderation/conflicts.js";
import { toCommentPublic } from "../comments/comments.mapper.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toReportModeration } from "../reviews/reviews.mapper.js";
import { toSanctionPublic } from "../sanctions/sanctions.mapper.js";
import { SanctionsService } from "../sanctions/sanctions.service.js";
import { closeCommentReports } from "./close-reports.js";

/** SPEC §6.2 step 4: human decision on the comments under review. */
@Injectable()
export class CommentModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sanctions: SanctionsService,
  ) {}

  /** Comments under review, heaviest reports first, without conflicts of interest (§2.3). */
  async queue(moderator: AuthUser): Promise<CommentModeration[]> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    const comments = await this.prisma.comment.findMany({
      where: { status: "UNDER_REVIEW", authorId: { notIn: excluded } },
      include: {
        author: { select: { pseudo: true } },
        reports: { where: { status: "PENDING" }, orderBy: { createdAt: "asc" } },
      },
    });
    return comments
      .map((comment) => ({
        ...toCommentPublic(comment),
        content: comment.content,
        reportCount: comment.reports.length,
        totalReportWeight: comment.reports.reduce((sum, report) => sum + report.weight, 0),
        reports: comment.reports.map(toReportModeration),
      }))
      .sort((a, b) => b.totalReportWeight - a.totalReportWeight);
  }

  /** VERIFIED (badge, no more reports) or REMOVED + sanction (§6.3); audited (§2.4). */
  async decide(
    moderator: AuthUser,
    commentId: string,
    input: CommentDecisionInput,
  ): Promise<ModerationDecisionResult> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({ where: { id: commentId } });
      if (!comment) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such comment");
      }
      if (excluded.includes(comment.authorId)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "CONFLICT_OF_INTEREST",
          "This file concerns you",
        );
      }
      const now = new Date();
      const removed = input.decision === "REMOVED";
      // Conditional update (CLAUDE.md §5.3): decided once, and only while under review.
      const updated = await tx.comment.updateMany({
        where: { id: commentId, status: "UNDER_REVIEW" },
        data: removed
          ? { status: "REMOVED", deletedAt: now, deletedBy: "MODERATOR" }
          : { status: "VERIFIED" },
      });
      if (updated.count !== 1) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "INVALID_STATUS_TRANSITION",
          "Not under review",
        );
      }
      await closeCommentReports(tx, commentId, removed ? "UPHELD" : "DISMISSED");
      const sanction = removed
        ? await this.sanctions.issue(
            tx,
            {
              userId: comment.authorId,
              moderatorId: moderator.id,
              commentId,
              isDiscrimination: input.isDiscrimination,
              reportToPharos: input.reportToPharos,
            },
            now,
          )
        : null;
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "comment.decision",
          targetType: "Comment",
          targetId: commentId,
          metadata: { decision: input.decision, sanction: sanction?.type ?? null },
        },
      });
      return { sanction: sanction ? toSanctionPublic({ ...sanction, appeal: null }) : null };
    });
  }
}
