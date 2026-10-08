import { HttpStatus, Injectable } from "@nestjs/common";
import {
  diversifySimilar,
  otherMediaCount,
  SIMILAR_POSTS_MIN_SHARED_WORDS,
  SIMILAR_POSTS_WINDOW_DAYS,
  type SimilarPostsPublic,
} from "@fama/shared";
import { Prisma } from "../generated/prisma/client.js";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { POST_INCLUDE } from "./post-record.js";
import { toPostSummaryPublic } from "./posts.mapper.js";

type SimilarRow = { id: string; authorId: string; sharedWords: number };

/**
 * SPEC §9 + docs/DECISIONS.md: posts of other editors on the same subject — same zone (and
 * locality), same theme, at least two significant words in common in the title and summary
 * (French full-text dictionary, accents ignored), published within 7 days of the post.
 */
@Injectable()
export class SimilarPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async forPost(postId: string, blockedIds: string[]): Promise<SimilarPostsPublic> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, removedAt: true },
    });
    if (!post || post.removedAt) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    // SPEC §10: the posts of blocked editors are never suggested.
    const notBlocked =
      blockedIds.length > 0
        ? Prisma.sql`AND c."authorId" NOT IN (${Prisma.join(blockedIds)})`
        : Prisma.empty;
    const rows = await this.prisma.$queryRaw<SimilarRow[]>`
      WITH target AS (
        SELECT p."authorId", p."zone", p."locality", p."theme", p."createdAt",
               tsvector_to_array(to_tsvector('french', f_unaccent(p."title" || ' ' || p."summary"))) AS words
        FROM "Post" p WHERE p."id" = ${postId}::uuid
      )
      SELECT c."id", c."authorId", shared."count"::int AS "sharedWords"
      FROM "Post" c
      CROSS JOIN target t
      CROSS JOIN LATERAL (
        SELECT count(*) AS "count" FROM (
          SELECT unnest(tsvector_to_array(to_tsvector('french', f_unaccent(c."title" || ' ' || c."summary"))))
          INTERSECT
          SELECT unnest(t.words)
        ) common
      ) shared
      WHERE c."authorId" <> t."authorId"
        AND c."removedAt" IS NULL
        AND c."zone" = t."zone"
        AND c."locality" IS NOT DISTINCT FROM t."locality"
        AND c."theme" = t."theme"
        AND c."createdAt" BETWEEN t."createdAt" - make_interval(days => ${SIMILAR_POSTS_WINDOW_DAYS})
                              AND t."createdAt" + make_interval(days => ${SIMILAR_POSTS_WINDOW_DAYS})
        AND shared."count" >= ${SIMILAR_POSTS_MIN_SHARED_WORDS}
        ${notBlocked}
      ORDER BY shared."count" DESC, c."createdAt" DESC, c."id"
    `;
    if (rows.length === 0) {
      return { otherMediaCount: 0, posts: [] };
    }

    const profiles = await this.prisma.editorProfile.findMany({
      where: { userId: { in: [...new Set(rows.map((row) => row.authorId))] } },
      select: { userId: true, ownerGroup: true, status: true },
    });
    const profileOf = new Map(profiles.map((profile) => [profile.userId, profile]));
    const chosen = diversifySimilar(
      rows.map((row) => ({
        id: row.id,
        editorId: row.authorId,
        ownerGroup: profileOf.get(row.authorId)?.ownerGroup ?? null,
        certified: profileOf.get(row.authorId)?.status === "CERTIFIED",
      })),
    );
    const posts = await this.prisma.post.findMany({
      where: { id: { in: chosen.map((item) => item.id) } },
      include: POST_INCLUDE,
    });
    const byId = new Map(posts.map((item) => [item.id, item]));
    return {
      otherMediaCount: otherMediaCount(rows.map((row) => ({ editorId: row.authorId }))),
      posts: chosen.flatMap((item) => {
        const found = byId.get(item.id);
        return found ? [toPostSummaryPublic(found)] : [];
      }),
    };
  }
}
