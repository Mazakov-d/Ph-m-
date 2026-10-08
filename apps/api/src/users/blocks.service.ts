import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser, BlockPublic } from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** SPEC §10: blocking a user hides their posts and comments from the blocker. */
@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blocker: AuthUser, blockedId: string): Promise<BlockPublic> {
    if (blockedId === blocker.id) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "You cannot block yourself",
      );
    }
    const blocked = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!blocked) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such user");
    }
    // Blocking twice is harmless: the existing block is kept.
    const block = await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: blocker.id, blockedId } },
      create: { blockerId: blocker.id, blockedId },
      update: {},
    });
    return {
      blockedUserId: blockedId,
      blockedPseudo: blocked.pseudo,
      createdAt: block.createdAt.toISOString(),
    };
  }

  async unblock(blocker: AuthUser, blockedId: string): Promise<void> {
    await this.prisma.block.deleteMany({ where: { blockerId: blocker.id, blockedId } });
  }

  async list(blocker: AuthUser): Promise<BlockPublic[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: blocker.id },
      orderBy: { createdAt: "desc" },
      include: { blocked: { select: { pseudo: true } } },
    });
    return blocks.map((block) => ({
      blockedUserId: block.blockedId,
      blockedPseudo: block.blocked.pseudo,
      createdAt: block.createdAt.toISOString(),
    }));
  }
}
