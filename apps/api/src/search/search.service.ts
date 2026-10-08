import { Injectable } from "@nestjs/common";
import {
  type AuthUser,
  feedWindowStart,
  SEARCH_EDITORS_MAX,
  SEARCH_POSTS_MAX,
  type SearchQuery,
  type SearchResultsPublic,
} from "@fama/shared";
import { POST_INCLUDE } from "../posts/post-record.js";
import { toPostSummaryPublic } from "../posts/posts.mapper.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * SPEC §4.4: one search over editors' pseudos (typo tolerant, pg_trgm) and posts (full text,
 * french, plus typo tolerance on titles), combinable with today / zone / theme.
 * The expressions match the indexes of the "search" migration, so PostgreSQL uses them.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    viewer: AuthUser | null,
    query: SearchQuery,
    now: Date = new Date(),
  ): Promise<SearchResultsPublic> {
    const [editors, posts] = await Promise.all([
      this.editors(query.q),
      this.posts(viewer, query, now),
    ]);
    return { editors, posts };
  }

  private async editors(q: string): Promise<SearchResultsPublic["editors"]> {
    const rows = await this.prisma.$queryRaw<{ id: string; pseudo: string; status: string }[]>`
      SELECT u."id", u."pseudo", e."status"::text AS "status"
      FROM "User" u
      JOIN "EditorProfile" e ON e."userId" = u."id"
      WHERE e."status" IN ('INDEPENDENT', 'CERTIFIED')
        AND (
          f_unaccent(lower(u."pseudo")) % f_unaccent(lower(${q}))
          OR f_unaccent(lower(u."pseudo")) LIKE '%' || f_unaccent(lower(${q})) || '%'
        )
      ORDER BY similarity(f_unaccent(lower(u."pseudo")), f_unaccent(lower(${q}))) DESC
      LIMIT ${SEARCH_EDITORS_MAX}`;
    return rows.flatMap((row) =>
      row.status === "INDEPENDENT" || row.status === "CERTIFIED"
        ? [{ id: row.id, pseudo: row.pseudo, editorStatus: row.status }]
        : [],
    );
  }

  private async posts(
    viewer: AuthUser | null,
    query: SearchQuery,
    now: Date,
  ): Promise<SearchResultsPublic["posts"]> {
    // SPEC §10: the authors the reader blocked are left out, as in the feed.
    const blockedIds = viewer
      ? (await this.prisma.block.findMany({ where: { blockerId: viewer.id } })).map(
          (b) => b.blockedId,
        )
      : [];
    const since = query.today ? feedWindowStart(now, true) : null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id"
      FROM "Post" p, plainto_tsquery('french', f_unaccent(${query.q})) AS tsq
      WHERE p."removedAt" IS NULL
        AND (
          (setweight(to_tsvector('french', f_unaccent(p."title")), 'A') ||
           setweight(to_tsvector('french', f_unaccent(p."summary")), 'B') ||
           setweight(to_tsvector('french', f_unaccent(p."body")), 'C')) @@ tsq
          OR f_unaccent(lower(p."title")) % f_unaccent(lower(${query.q}))
        )
        AND (${since}::timestamptz IS NULL OR p."createdAt" >= ${since}::timestamptz)
        AND (${query.zone ?? null}::text IS NULL OR p."zone"::text = ${query.zone ?? null}::text)
        AND (${query.theme ?? null}::text IS NULL OR p."theme"::text = ${query.theme ?? null}::text)
        AND NOT (p."authorId" = ANY(${blockedIds}::uuid[]))
      ORDER BY
        ts_rank(
          setweight(to_tsvector('french', f_unaccent(p."title")), 'A') ||
          setweight(to_tsvector('french', f_unaccent(p."summary")), 'B') ||
          setweight(to_tsvector('french', f_unaccent(p."body")), 'C'),
          tsq
        ) + similarity(f_unaccent(lower(p."title")), f_unaccent(lower(${query.q}))) DESC,
        p."createdAt" DESC
      LIMIT ${SEARCH_POSTS_MAX}`;
    const ids = rows.map((row) => row.id);
    const posts = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      include: POST_INCLUDE,
      omit: { body: true },
    });
    // Back in the order of relevance.
    return ids.flatMap((id) => {
      const post = posts.find((candidate) => candidate.id === id);
      return post ? [toPostSummaryPublic(post)] : [];
    });
  }
}
