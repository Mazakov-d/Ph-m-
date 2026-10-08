import { HttpStatus, Injectable } from "@nestjs/common";
import { type AuthUser, canSeeVoteResults, type VoteSummaryPublic } from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import type { VoteOption } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SPEC §7: the choices are always given; the totals only to a reader who voted or clicked
   * « Voir sans voter » (canSeeVoteResults). Votes never play a part in any order.
   */
  async summaryFor(
    postId: string,
    options: Pick<VoteOption, "id" | "label">[],
    viewerId: string | null,
  ): Promise<VoteSummaryPublic> {
    const own = viewerId
      ? await this.prisma.vote.findUnique({
          where: { postId_userId: { postId, userId: viewerId } },
        })
      : null;
    const myOptionId = own?.optionId ?? null;
    const revealedResults = own?.revealedResults ?? false;

    let results: VoteSummaryPublic["results"] = null;
    if (canSeeVoteResults(myOptionId !== null, revealedResults)) {
      const groups = await this.prisma.vote.groupBy({
        by: ["optionId"],
        where: { postId, optionId: { not: null } },
        _count: { _all: true },
      });
      const counts = options.map((option) => ({
        optionId: option.id,
        count: groups.find((group) => group.optionId === option.id)?._count._all ?? 0,
      }));
      results = { totalVotes: counts.reduce((sum, { count }) => sum + count, 0), counts };
    }
    return {
      options: options.map((option) => ({ id: option.id, label: option.label })),
      myOptionId,
      revealedResults,
      results,
    };
  }

  /** SPEC §7: votes for one of the choices, or changes the vote (one row per account). */
  async cast(voter: AuthUser, postId: string, optionId: string): Promise<VoteSummaryPublic> {
    const options = await this.opinionOptions(postId);
    if (!options.some((option) => option.id === optionId)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Not a choice of this opinion",
      );
    }
    await this.prisma.vote.upsert({
      where: { postId_userId: { postId, userId: voter.id } },
      create: { postId, userId: voter.id, optionId },
      update: { optionId },
    });
    return this.summaryFor(postId, options, voter.id);
  }

  /** SPEC §7: « Voir sans voter », remembered for the account (docs/DECISIONS.md). */
  async reveal(viewer: AuthUser, postId: string): Promise<VoteSummaryPublic> {
    const options = await this.opinionOptions(postId);
    await this.prisma.vote.upsert({
      where: { postId_userId: { postId, userId: viewer.id } },
      create: { postId, userId: viewer.id, revealedResults: true },
      update: { revealedResults: true },
    });
    return this.summaryFor(postId, options, viewer.id);
  }

  private async opinionOptions(postId: string): Promise<VoteOption[]> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { voteOptions: { orderBy: { position: "asc" } } },
    });
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    if (post.kind !== "OPINION") {
      throw new ApiException(HttpStatus.CONFLICT, "NOT_AN_OPINION", "Only opinions are voted on");
    }
    return post.voteOptions;
  }
}
