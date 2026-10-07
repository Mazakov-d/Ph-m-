import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  type CreatePostInput,
  feedWindowStart,
  type Paginated,
  type PostPublic,
  type PostQuery,
  type PostSummaryPublic,
  type UpdatePostCommentsInput,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { FILE_EXTENSIONS } from "../common/files/file-type.js";
import { decodeCursor, toPage } from "../common/pagination/cursor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { type PostImageType, sanitizeImage } from "./post-images.js";
import { POST_INCLUDE } from "./post-record.js";
import { toPostPublic, toPostSummaryPublic } from "./posts.mapper.js";

export type UploadedImage = { bytes: Uint8Array; type: PostImageType };

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** SPEC §3: publishes a post with its sources and images (it cannot be modified afterwards). */
  async create(
    author: AuthUser,
    input: CreatePostInput,
    images: UploadedImage[],
  ): Promise<PostPublic> {
    const postId = randomUUID();
    const imageKeys = await this.storeImages(postId, images);
    try {
      const post = await this.prisma.post.create({
        data: {
          id: postId,
          authorId: author.id,
          kind: input.kind,
          title: input.title,
          summary: input.summary,
          body: input.body,
          zone: input.zone,
          region: input.region,
          theme: input.theme,
          // SPEC §3: comments are always enabled on an opinion.
          commentsEnabled: input.kind === "OPINION" || input.commentsEnabled,
          sources: { create: input.sources.map((value, position) => ({ value, position })) },
          images: { create: imageKeys.map((storageKey, position) => ({ storageKey, position })) },
        },
        include: POST_INCLUDE,
      });
      return toPostPublic(post);
    } catch (error) {
      // The post was not saved: its images must not stay in storage.
      await this.storage.delete(imageKeys);
      throw error;
    }
  }

  /**
   * SPEC §4.1 and §4.3: posts of the last 48 hours (or 24 with `today`), newest first, with the
   * zone and theme filters, without the authors the reader blocked (SPEC §10).
   * Votes never play a part in the order (SPEC §7).
   */
  async feed(
    viewer: AuthUser | null,
    query: PostQuery,
    now: Date = new Date(),
  ): Promise<Paginated<PostSummaryPublic>> {
    const blockedIds = viewer ? await this.blockedAuthorIds(viewer.id) : [];
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: feedWindowStart(now, query.today) },
        zone: query.zone,
        theme: query.theme,
        authorId: { notIn: blockedIds },
        ...(after && {
          OR: [
            { createdAt: { lt: after.createdAt } },
            { createdAt: after.createdAt, id: { lt: after.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: POST_INCLUDE,
      // The feed shows cards: the body is only sent with the full post.
      omit: { body: true },
    });
    const page = toPage(rows, query.limit, (row) => row);
    return { items: page.rows.map(toPostSummaryPublic), nextCursor: page.nextCursor };
  }

  private async blockedAuthorIds(viewerId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: viewerId },
      select: { blockedId: true },
    });
    return blocks.map((block) => block.blockedId);
  }

  /** SPEC §3: the editor turns comments on or off on their own articles, never off on an opinion. */
  async updateComments(
    editor: AuthUser,
    postId: string,
    input: UpdatePostCommentsInput,
  ): Promise<PostPublic> {
    // Conditional update (CLAUDE.md §5.3): own post and article, checked in the same query.
    const updated = await this.prisma.post.updateMany({
      where: { id: postId, authorId: editor.id, kind: "ARTICLE" },
      data: { commentsEnabled: input.commentsEnabled },
    });
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: POST_INCLUDE,
    });
    if (updated.count === 1 && post) {
      return toPostPublic(post);
    }
    // Nothing was updated: explain why.
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    if (post.authorId !== editor.id) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your post");
    }
    if (!input.commentsEnabled) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "COMMENTS_REQUIRED_FOR_OPINION",
        "Comments cannot be turned off on an opinion",
      );
    }
    // Turning comments on for an opinion: they already are.
    return toPostPublic(post);
  }

  private async storeImages(postId: string, images: UploadedImage[]): Promise<string[]> {
    const keys: string[] = [];
    try {
      for (const image of images) {
        const sanitized = await sanitizeImage(image.bytes, image.type);
        const key = `post-images/${postId}/${randomUUID()}.${FILE_EXTENSIONS[image.type]}`;
        await this.storage.put(key, sanitized, image.type);
        keys.push(key);
      }
      return keys;
    } catch (error) {
      await this.storage.delete(keys);
      throw error;
    }
  }
}
