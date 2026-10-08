import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AppealModeration,
  type AuthUser,
  computeReviewPriority,
  type CreateReviewInput,
  type ReviewPublic,
  type ReviewQueueItemModeration,
  type Verdict,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { excludedAuthorIds } from "../common/moderation/conflicts.js";
import type { Prisma } from "../generated/prisma/client.js";
import { POST_INCLUDE } from "../posts/post-record.js";
import { toPostSummaryPublic } from "../posts/posts.mapper.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toReportModeration, toReviewPublic } from "./reviews.mapper.js";

type Tx = Prisma.TransactionClient;

// SPEC §5.5: reports become UPHELD unless the article is found ACCURATE.
const isAccurate = (verdict: Verdict) => verdict === "ACCURATE";

/** Moderation side of article reviews (SPEC §5.4, §5.5). */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** SPEC §5.4: articles under review by decreasing priority, without conflicts (§2.3). */
  async queue(moderator: AuthUser): Promise<ReviewQueueItemModeration[]> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    const posts = await this.prisma.post.findMany({
      where: { reviewStatus: "UNDER_REVIEW", kind: "ARTICLE", authorId: { notIn: excluded } },
      include: {
        ...POST_INCLUDE,
        reports: { where: { status: "PENDING" }, orderBy: { createdAt: "asc" } },
      },
    });
    return posts
      .map((post) => {
        const score = post.reports.reduce((sum, report) => sum + report.weight, 0);
        return {
          post: toPostSummaryPublic(post),
          viewCount: post.viewCount,
          score,
          priority: computeReviewPriority(score, post.viewCount),
          reports: post.reports.map(toReportModeration),
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /** SPEC §5.5: verdict, public note and sources; closes the reports; audited (§2.4). */
  async decide(
    moderator: AuthUser,
    postId: string,
    input: CreateReviewInput,
  ): Promise<ReviewPublic> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
      }
      if (excluded.includes(post.authorId)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "CONFLICT_OF_INTEREST",
          "This file concerns you",
        );
      }
      // Conditional update (CLAUDE.md §5.3): two moderators cannot both judge the article.
      const updated = await tx.post.updateMany({
        where: { id: postId, kind: "ARTICLE", reviewStatus: "UNDER_REVIEW" },
        data: { reviewStatus: "REVIEWED" },
      });
      if (updated.count !== 1) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "INVALID_STATUS_TRANSITION",
          "This article is not under review",
        );
      }
      const review = await tx.review.create({
        data: { postId, moderatorId: moderator.id, ...input },
        include: { editorReply: true },
      });
      await this.closePendingReports(tx, postId, input.verdict);
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "post.verdict",
          targetType: "Post",
          targetId: postId,
          metadata: { reviewId: review.id, verdict: input.verdict },
        },
      });
      return toReviewPublic(review, "NONE");
    });
  }

  /** docs/DECISIONS.md: pending appeals, never to the author of the verdict nor in conflict. */
  async appeals(moderator: AuthUser): Promise<AppealModeration[]> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    const appeals = await this.prisma.appeal.findMany({
      where: {
        resolvedAt: null,
        review: { moderatorId: { not: moderator.id }, post: { authorId: { notIn: excluded } } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        review: {
          include: { editorReply: true, post: { include: POST_INCLUDE } },
        },
      },
    });
    // Every appeal listed targets a review (see the filter above).
    return appeals.flatMap(({ review, ...appeal }) =>
      review
        ? [
            {
              id: appeal.id,
              post: toPostSummaryPublic(review.post),
              review: toReviewPublic(review, "PENDING"),
              reviewModeratorId: review.moderatorId,
              reason: appeal.reason,
              createdAt: appeal.createdAt.toISOString(),
            },
          ]
        : [],
    );
  }

  /**
   * docs/DECISIONS.md: another moderator gives the final verdict. If it changes whether the
   * article is accurate, the reports and the reporters' counters are corrected.
   */
  async decideAppeal(
    moderator: AuthUser,
    appealId: string,
    input: CreateReviewInput,
  ): Promise<ReviewPublic> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    return this.prisma.$transaction(async (tx) => {
      const appeal = await tx.appeal.findUnique({
        where: { id: appealId },
        include: { review: { include: { post: true } } },
      });
      const original = appeal?.review;
      if (!appeal || !original) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such appeal");
      }
      // SPEC §5.5: the appeal is handled by another moderator.
      if (original.moderatorId === moderator.id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "SAME_MODERATOR_APPEAL",
          "The author of the verdict cannot handle its appeal",
        );
      }
      if (excluded.includes(original.post.authorId)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "CONFLICT_OF_INTEREST",
          "This file concerns you",
        );
      }
      // Conditional update: an appeal is decided once.
      const resolved = await tx.appeal.updateMany({
        where: { id: appealId, resolvedAt: null },
        data: {
          resolvedAt: new Date(),
          resolvedById: moderator.id,
          accepted: input.verdict !== original.verdict,
        },
      });
      if (resolved.count !== 1) {
        throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION", "Already decided");
      }
      const review = await tx.review.create({
        data: { postId: original.postId, moderatorId: moderator.id, ...input },
        include: { editorReply: true },
      });
      if (isAccurate(input.verdict) !== isAccurate(original.verdict)) {
        await this.flipClosedReports(tx, original.postId, input.verdict);
      }
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "post.appeal.decision",
          targetType: "Post",
          targetId: original.postId,
          metadata: { appealId, from: original.verdict, to: input.verdict },
        },
      });
      return toReviewPublic(review, "DECIDED");
    });
  }

  private async closePendingReports(tx: Tx, postId: string, verdict: Verdict): Promise<void> {
    const status = isAccurate(verdict) ? "DISMISSED" : "UPHELD";
    const pending = await tx.postReport.findMany({ where: { postId, status: "PENDING" } });
    await tx.postReport.updateMany({ where: { postId, status: "PENDING" }, data: { status } });
    // SPEC §5.5: the reporters' history feeds the weight of their next reports (§5.2).
    await tx.user.updateMany({
      where: { id: { in: pending.map((report) => report.reporterId) } },
      data:
        status === "UPHELD"
          ? { upheldReportCount: { increment: 1 } }
          : { dismissedReportCount: { increment: 1 } },
    });
  }

  private async flipClosedReports(tx: Tx, postId: string, newVerdict: Verdict): Promise<void> {
    const [from, to] = isAccurate(newVerdict)
      ? (["UPHELD", "DISMISSED"] as const)
      : (["DISMISSED", "UPHELD"] as const);
    const reports = await tx.postReport.findMany({ where: { postId, status: from } });
    await tx.postReport.updateMany({ where: { postId, status: from }, data: { status: to } });
    await tx.user.updateMany({
      where: { id: { in: reports.map((report) => report.reporterId) } },
      data:
        to === "UPHELD"
          ? { upheldReportCount: { increment: 1 }, dismissedReportCount: { decrement: 1 } }
          : { upheldReportCount: { decrement: 1 }, dismissedReportCount: { increment: 1 } },
    });
  }
}
