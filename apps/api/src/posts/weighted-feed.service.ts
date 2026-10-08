import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  feedWindowStart,
  type Paginated,
  type PostQuery,
  type PostSummaryPublic,
  weightedFeedOrder,
} from "@fama/shared";
import {
  decodeWeightedCursor,
  encodeWeightedCursor,
} from "../common/pagination/weighted-cursor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { POST_INCLUDE } from "./post-record.js";
import { toPostSummaryPublic } from "./posts.mapper.js";

/**
 * SPEC §4.2 + docs/DECISIONS.md: the « À la une » feed. The posts of the window are drawn at
 * random in proportion to their weight (freshness, reliability, √n), with the editor spacing
 * rule; the order is computed in shared/domain/weighted-feed.ts.
 */
@Injectable()
export class WeightedFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async page(
    query: PostQuery,
    blockedIds: string[],
    now: Date,
  ): Promise<Paginated<PostSummaryPublic>> {
    const cursor = query.cursor
      ? decodeWeightedCursor(query.cursor)
      : { seed: query.seed ?? randomUUID(), asOf: now, offset: 0 };

    // Same window and filters as the chronological feed (SPEC §4.1, §4.3, §10), frozen at `asOf`.
    const candidates = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: feedWindowStart(cursor.asOf, query.today), lte: cursor.asOf },
        removedAt: null,
        zone: query.zone,
        theme: query.theme,
        authorId: { notIn: blockedIds },
      },
      select: {
        id: true,
        authorId: true,
        createdAt: true,
        kind: true,
        reviewStatus: true,
        reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { verdict: true } },
      },
    });
    const order = weightedFeedOrder(
      candidates.map((post) => ({
        id: post.id,
        editorId: post.authorId,
        createdAt: post.createdAt,
        kind: post.kind,
        reviewStatus: post.reviewStatus,
        verdict: post.reviews[0]?.verdict ?? null,
      })),
      cursor.asOf,
      cursor.seed,
    );

    const pageIds = order.slice(cursor.offset, cursor.offset + query.limit);
    const posts = await this.prisma.post.findMany({
      where: { id: { in: pageIds } },
      include: POST_INCLUDE,
    });
    const byId = new Map(posts.map((post) => [post.id, post]));
    const nextOffset = cursor.offset + pageIds.length;
    return {
      items: pageIds.flatMap((id) => {
        const post = byId.get(id);
        return post ? [toPostSummaryPublic(post)] : [];
      }),
      nextCursor:
        nextOffset < order.length ? encodeWeightedCursor({ ...cursor, offset: nextOffset }) : null,
    };
  }
}
