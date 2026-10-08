import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  computeReportWeight,
  type CreatePostReportInput,
  type ReportPublic,
  shouldOpenPostReview,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PostReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SPEC §5.1–§5.3: reports a post with a weight computed now and stored (§5.2), then opens the
   * review of an article when the pending score reaches the threshold (§5.3).
   */
  async report(
    reporter: AuthUser,
    postId: string,
    input: CreatePostReportInput,
    now: Date = new Date(),
  ): Promise<ReportPublic> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Locks the post: concurrent reports are counted one after the other, so that the
        // threshold is never missed because two transactions did not see each other.
        await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id" = ${postId}::uuid FOR UPDATE`;
        const post = await tx.post.findUnique({ where: { id: postId } });
        if (!post) {
          throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
        }
        // docs/DECISIONS.md: nothing happens any more on a removed opinion.
        if (post.removedAt) {
          throw new ApiException(HttpStatus.GONE, "POST_REMOVED", "Removed by moderation");
        }
        // SPEC §5.1: an editor cannot report their own posts.
        if (post.authorId === reporter.id) {
          throw new ApiException(
            HttpStatus.FORBIDDEN,
            "CANNOT_REPORT_OWN_CONTENT",
            "You cannot report your own post",
          );
        }
        // docs/DECISIONS.md: a reviewed article can no longer be reported.
        if (post.reviewStatus === "REVIEWED") {
          throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REVIEWED", "Already reviewed");
        }

        const account = await tx.user.findUniqueOrThrow({ where: { id: reporter.id } });
        const report = await tx.postReport.create({
          data: {
            postId,
            reporterId: reporter.id,
            reason: input.reason,
            details: input.details,
            weight: computeReportWeight(account, now),
          },
        });

        // docs/DECISIONS.md: an opinion never gets a reliability review.
        if (post.kind === "ARTICLE" && post.reviewStatus === "NOT_REVIEWED") {
          const pending = await tx.postReport.aggregate({
            where: { postId, status: "PENDING" },
            _sum: { weight: true },
          });
          if (shouldOpenPostReview(pending._sum.weight ?? 0, post.viewCount)) {
            await tx.post.update({ where: { id: postId }, data: { reviewStatus: "UNDER_REVIEW" } });
          }
        }
        return { id: report.id, reason: report.reason, createdAt: report.createdAt.toISOString() };
      });
    } catch (error) {
      // SPEC §5.1: one report per account and post (unique key).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REPORTED", "Already reported");
      }
      throw error;
    }
  }
}
