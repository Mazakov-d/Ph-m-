import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  computeReportWeight,
  type CreateCommentReportInput,
  type ReportPublic,
  shouldHideComment,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class CommentReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SPEC §6.2: reports a comment (weight as in §5.2, stored); once the pending weights reach
   * COMMENT_REPORT_THRESHOLD, a visible comment goes UNDER_REVIEW and is hidden.
   */
  async report(
    reporter: AuthUser,
    commentId: string,
    input: CreateCommentReportInput,
    now: Date = new Date(),
  ): Promise<ReportPublic> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Locks the comment: concurrent reports never miss the threshold.
        await tx.$queryRaw`SELECT "id" FROM "Comment" WHERE "id" = ${commentId}::uuid FOR UPDATE`;
        const comment = await tx.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
          throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such comment");
        }
        if (comment.authorId === reporter.id) {
          throw new ApiException(
            HttpStatus.FORBIDDEN,
            "CANNOT_REPORT_OWN_CONTENT",
            "You cannot report your own comment",
          );
        }
        // SPEC §6.2 step 5: a VERIFIED comment can no longer be reported.
        if (comment.status === "VERIFIED") {
          throw new ApiException(
            HttpStatus.CONFLICT,
            "COMMENT_ALREADY_VERIFIED",
            "Already verified",
          );
        }
        if (comment.status === "REMOVED" || comment.status === "DELETED") {
          throw new ApiException(
            HttpStatus.CONFLICT,
            "INVALID_STATUS_TRANSITION",
            "This comment is no longer shown",
          );
        }
        const account = await tx.user.findUniqueOrThrow({ where: { id: reporter.id } });
        const report = await tx.commentReport.create({
          data: {
            commentId,
            reporterId: reporter.id,
            reason: input.reason,
            details: input.details,
            weight: computeReportWeight(account, now),
          },
        });
        if (comment.status === "VISIBLE") {
          const pending = await tx.commentReport.aggregate({
            where: { commentId, status: "PENDING" },
            _sum: { weight: true },
          });
          if (shouldHideComment(pending._sum.weight ?? 0)) {
            await tx.comment.update({ where: { id: commentId }, data: { status: "UNDER_REVIEW" } });
          }
        }
        return { id: report.id, reason: report.reason, createdAt: report.createdAt.toISOString() };
      });
    } catch (error) {
      // SPEC §6.2: one report per account and comment (unique key).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REPORTED", "Already reported");
      }
      throw error;
    }
  }
}
