import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  ModerationDecisionResult,
  PostModerationDecisionInput,
  ReviewQueueItemModeration,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { excludedAuthorIds } from "../common/moderation/conflicts.js";
import { POST_INCLUDE } from "../posts/post-record.js";
import { toPostSummaryPublic } from "../posts/posts.mapper.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toReportModeration } from "../reviews/reviews.mapper.js";
import { toSanctionPublic } from "../sanctions/sanctions.mapper.js";
import { SanctionsService } from "../sanctions/sanctions.service.js";
import { closePostReports } from "./close-reports.js";

/** docs/DECISIONS.md: reported opinions (SPEC §6.3: same rules as comments for editors' posts). */
@Injectable()
export class PostModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sanctions: SanctionsService,
  ) {}

  /** Opinions with pending reports, heaviest first, without conflicts of interest. */
  async queue(moderator: AuthUser): Promise<ReviewQueueItemModeration[]> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    const posts = await this.prisma.post.findMany({
      where: {
        kind: "OPINION",
        removedAt: null,
        authorId: { notIn: excluded },
        reports: { some: { status: "PENDING" } },
      },
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
          priority: score,
          reports: post.reports.map(toReportModeration),
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /** Compliant (reports dismissed) or removed (hidden) + sanction of the editor; audited. */
  async decide(
    moderator: AuthUser,
    postId: string,
    input: PostModerationDecisionInput,
  ): Promise<ModerationDecisionResult> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    return this.prisma.$transaction(async (tx) => {
      // Locks the post: a decision and a new report cannot interleave.
      await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id" = ${postId}::uuid FOR UPDATE`;
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: { reports: { where: { status: "PENDING" } } },
      });
      if (!post || post.kind !== "OPINION") {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such opinion");
      }
      if (excluded.includes(post.authorId)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "CONFLICT_OF_INTEREST",
          "This file concerns you",
        );
      }
      if (post.removedAt || post.reports.length === 0) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "INVALID_STATUS_TRANSITION",
          "Nothing to decide",
        );
      }
      const now = new Date();
      const removed = input.decision === "REMOVED";
      if (removed) {
        await tx.post.update({ where: { id: postId }, data: { removedAt: now } });
      }
      await closePostReports(tx, postId, removed ? "UPHELD" : "DISMISSED");
      const sanction = removed
        ? await this.sanctions.issue(
            tx,
            {
              userId: post.authorId,
              moderatorId: moderator.id,
              postId,
              isDiscrimination: input.isDiscrimination,
              reportToPharos: input.reportToPharos,
            },
            now,
          )
        : null;
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "post.moderation",
          targetType: "Post",
          targetId: postId,
          metadata: { decision: input.decision, sanction: sanction?.type ?? null },
        },
      });
      return { sanction: sanction ? toSanctionPublic({ ...sanction, appeal: null }) : null };
    });
  }
}
