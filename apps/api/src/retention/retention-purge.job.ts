import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RETENTION_DAYS } from "@fama/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * SPEC §6 and §10 + docs/DECISIONS.md: after RETENTION_DAYS, the text of deleted or removed
 * comments (and their reports) is erased, and the legal identity and documents of deleted
 * editor accounts are erased.
 */
@Injectable()
export class RetentionPurgeJob {
  private readonly logger = new Logger(RetentionPurgeJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(now: Date = new Date()): Promise<{ comments: number; identities: number }> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * MILLISECONDS_PER_DAY);

    const expired = await this.prisma.comment.findMany({
      where: {
        status: { in: ["DELETED", "REMOVED"] },
        deletedAt: { lt: cutoff },
        content: { not: "" },
      },
      select: { id: true },
    });
    const commentIds = expired.map((comment) => comment.id);
    await this.prisma.$transaction([
      this.prisma.commentReport.deleteMany({ where: { commentId: { in: commentIds } } }),
      // The empty row stays, so that the replies keep their thread.
      this.prisma.comment.updateMany({ where: { id: { in: commentIds } }, data: { content: "" } }),
    ]);

    const identities = await this.prisma.editorIdentity.findMany({
      where: { user: { deletedAt: { lt: cutoff } } },
    });
    for (const identity of identities) {
      await this.storage.delete(identity.documentKeys);
      await this.prisma.editorIdentity.delete({ where: { userId: identity.userId } });
    }

    this.logger.log(
      `Purged ${commentIds.length} comments and ${identities.length} editor identities`,
    );
    return { comments: commentIds.length, identities: identities.length };
  }
}
