import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  nextSanction,
  sanctionCountingStart,
  type SanctionAppealModeration,
  type SanctionPublic,
  suspensionEndsAt,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { excludedAuthorIds } from "../common/moderation/conflicts.js";
import { Prisma, type Sanction } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toSanctionPublic } from "./sanctions.mapper.js";

type Tx = Prisma.TransactionClient;

export type SanctionCause = {
  userId: string;
  moderatorId: string;
  commentId?: string;
  postId?: string;
  isDiscrimination: boolean;
  reportToPharos: boolean;
};

/** SPEC §6.3: sanctions, their effects on the account and their single appeal. */
@Injectable()
export class SanctionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issues the sanction for a content that was just REMOVED (inside the caller's transaction,
   * after the removal): counts the removed comments and opinions of the last 6 months,
   * picks the sanction with nextSanction and restricts the account accordingly.
   */
  async issue(tx: Tx, cause: SanctionCause, now: Date = new Date()): Promise<Sanction> {
    const since = sanctionCountingStart(now);
    const [removedComments, removedPosts] = await Promise.all([
      tx.comment.count({
        where: { authorId: cause.userId, status: "REMOVED", deletedAt: { gte: since } },
      }),
      tx.post.count({ where: { authorId: cause.userId, removedAt: { gte: since } } }),
    ]);
    const type = nextSanction(removedComments + removedPosts, cause.isDiscrimination);
    const sanction = await tx.sanction.create({
      data: {
        userId: cause.userId,
        moderatorId: cause.moderatorId,
        type,
        commentId: cause.commentId,
        postId: cause.postId,
        reportToPharos: cause.reportToPharos,
        endsAt: suspensionEndsAt(type, now),
      },
    });
    await this.applyRestrictions(tx, cause.userId, now);
    return sanction;
  }

  /** The signed-in account's sanctions, newest first (« Mes sanctions »). */
  async mine(user: AuthUser): Promise<SanctionPublic[]> {
    const sanctions = await this.prisma.sanction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { appeal: true },
    });
    return sanctions.map(toSanctionPublic);
  }

  /** SPEC §6.3: one appeal per sanction, by the sanctioned account (even suspended or banned). */
  async appeal(user: AuthUser, sanctionId: string, reason: string): Promise<SanctionPublic> {
    const sanction = await this.prisma.sanction.findUnique({ where: { id: sanctionId } });
    if (!sanction || sanction.userId !== user.id) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such sanction");
    }
    try {
      await this.prisma.appeal.create({ data: { appellantId: user.id, sanctionId, reason } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(HttpStatus.CONFLICT, "APPEAL_ALREADY_USED", "Already appealed");
      }
      throw error;
    }
    const updated = await this.prisma.sanction.findUniqueOrThrow({
      where: { id: sanctionId },
      include: { appeal: true },
    });
    return toSanctionPublic(updated);
  }

  /** Pending sanction appeals, never to the moderator who issued the sanction. */
  async pendingAppeals(moderator: AuthUser): Promise<SanctionAppealModeration[]> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    const appeals = await this.prisma.appeal.findMany({
      where: {
        resolvedAt: null,
        sanction: { moderatorId: { not: moderator.id }, userId: { notIn: excluded } },
      },
      orderBy: { createdAt: "asc" },
      include: { sanction: { include: { appeal: true, user: true, comment: true, post: true } } },
    });
    return appeals.flatMap(({ sanction, ...appeal }) =>
      sanction
        ? [
            {
              id: appeal.id,
              sanction: toSanctionPublic(sanction),
              sanctionedPseudo: sanction.user.pseudo,
              sanctionModeratorId: sanction.moderatorId,
              content: sanction.comment?.content ?? sanction.post?.body ?? null,
              reason: appeal.reason,
              createdAt: appeal.createdAt.toISOString(),
            },
          ]
        : [],
    );
  }

  /**
   * docs/DECISIONS.md: another moderator or an admin decides. Accepted, the sanction is lifted,
   * the account's restrictions are recomputed and the content becomes VERIFIED again.
   */
  async decideAppeal(
    moderator: AuthUser,
    appealId: string,
    accepted: boolean,
  ): Promise<SanctionPublic> {
    const excluded = await excludedAuthorIds(this.prisma, moderator.id);
    return this.prisma.$transaction(async (tx) => {
      const appeal = await tx.appeal.findUnique({
        where: { id: appealId },
        include: { sanction: true },
      });
      const sanction = appeal?.sanction;
      if (!appeal || !sanction) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such appeal");
      }
      if (sanction.moderatorId === moderator.id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "SAME_MODERATOR_APPEAL",
          "The author of the sanction cannot handle its appeal",
        );
      }
      if (excluded.includes(sanction.userId)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "CONFLICT_OF_INTEREST",
          "This file concerns you",
        );
      }
      const now = new Date();
      const resolved = await tx.appeal.updateMany({
        where: { id: appealId, resolvedAt: null },
        data: { resolvedAt: now, resolvedById: moderator.id, accepted },
      });
      if (resolved.count !== 1) {
        throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION", "Already decided");
      }
      if (accepted) {
        await tx.sanction.update({ where: { id: sanction.id }, data: { liftedAt: now } });
        if (sanction.commentId) {
          await tx.comment.update({
            where: { id: sanction.commentId },
            data: { status: "VERIFIED", deletedAt: null, deletedBy: null },
          });
        }
        if (sanction.postId) {
          await tx.post.update({ where: { id: sanction.postId }, data: { removedAt: null } });
        }
        await this.applyRestrictions(tx, sanction.userId, now);
      }
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "sanction.appeal.decision",
          targetType: "User",
          targetId: sanction.userId,
          metadata: { appealId, sanctionId: sanction.id, accepted },
        },
      });
      const updated = await tx.sanction.findUniqueOrThrow({
        where: { id: sanction.id },
        include: { appeal: true },
      });
      return toSanctionPublic(updated);
    });
  }

  /**
   * The account's restrictions follow its sanctions that are not lifted: banned if one of them
   * is a ban, suspended until the latest end of a running suspension.
   */
  private async applyRestrictions(tx: Tx, userId: string, now: Date): Promise<void> {
    const active = await tx.sanction.findMany({ where: { userId, liftedAt: null } });
    const ban = active.find((sanction) => sanction.type === "PERMANENT_BAN");
    const latestEnd = active
      .map((sanction) => sanction.endsAt)
      .filter((end): end is Date => end !== null && end > now)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    await tx.user.update({
      where: { id: userId },
      data: { bannedAt: ban?.createdAt ?? null, suspendedUntil: latestEnd ?? null },
    });
  }
}
