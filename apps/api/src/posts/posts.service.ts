import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  type CreatePostInput,
  type CursorQuery,
  DEFAULT_VOTE_OPTIONS,
  feedWindowStart,
  localitiesWithin,
  type Paginated,
  type PostPublic,
  type PostQuery,
  type PostSummaryPublic,
  type SimilarPostsPublic,
  type UpdatePostCommentsInput,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { FILE_EXTENSIONS } from "../common/files/file-type.js";
import { decodeCursor, toPage } from "../common/pagination/cursor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { type StoredObject, StorageService } from "../storage/storage.service.js";
import { VotesService } from "../votes/votes.service.js";
import { type PostImageType, sanitizeImage } from "./post-images.js";
import { POST_INCLUDE, type PostRecord } from "./post-record.js";
import { toPostPublic, toPostSummaryPublic } from "./posts.mapper.js";
import { PostVideosService } from "./post-videos.service.js";
import { SimilarPostsService } from "./similar-posts.service.js";
import { WeightedFeedService } from "./weighted-feed.service.js";
import { EditorReliabilityService } from "../reliability/editor-reliability.service.js";

export type UploadedImage = { bytes: Uint8Array; type: PostImageType };

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly votesService: VotesService,
    private readonly weightedFeed: WeightedFeedService,
    private readonly reliability: EditorReliabilityService,
    private readonly similarPosts: SimilarPostsService,
    private readonly notifications: NotificationsService,
    private readonly videos: PostVideosService,
  ) {}

  /** SPEC §9: « X autres médias en parlent » and the similar posts, for the reader. */
  async similar(viewer: AuthUser | null, postId: string): Promise<SimilarPostsPublic> {
    const blockedIds = viewer ? await this.blockedAuthorIds(viewer.id) : [];
    return this.similarPosts.forPost(postId, blockedIds);
  }

  /** A full post as seen by `viewerId` (their vote, and the totals if they may see them). */
  private async toPublic(post: PostRecord, viewerId: string | null): Promise<PostPublic> {
    const votes =
      post.kind === "OPINION"
        ? await this.votesService.summaryFor(post.id, post.voteOptions, viewerId)
        : null;
    const ownReport = viewerId
      ? await this.prisma.postReport.findUnique({
          where: { postId_reporterId: { postId: post.id, reporterId: viewerId } },
          select: { id: true },
        })
      : null;
    const editorReliability = await this.reliability.levelFor(post.authorId);
    const profile = await this.prisma.editorProfile.findUnique({
      where: { userId: post.authorId },
      select: { donationUrl: true },
    });
    return toPostPublic(
      post,
      votes,
      ownReport !== null,
      editorReliability,
      profile?.donationUrl ?? null,
    );
  }

  /**
   * SPEC §3: publishes a post with its sources, images and video (docs/DECISIONS.md: one at
   * most, given as the path of the uploaded file); it cannot be modified afterwards.
   */
  async create(
    author: AuthUser,
    input: CreatePostInput,
    images: UploadedImage[],
    videoPath: string | null = null,
  ): Promise<PostPublic> {
    const postId = randomUUID();
    const video = videoPath ? await this.videos.store(postId, videoPath) : null;
    let imageKeys: string[] = [];
    try {
      imageKeys = await this.storeImages(postId, images);
      const post = await this.prisma.post.create({
        data: {
          id: postId,
          authorId: author.id,
          kind: input.kind,
          title: input.title,
          summary: input.summary,
          body: input.body,
          zone: input.zone,
          locality: input.locality,
          theme: input.theme,
          // SPEC §3: comments are always enabled on an opinion.
          commentsEnabled: input.kind === "OPINION" || input.commentsEnabled,
          layout: input.layout,
          titleTypeface: input.typefaces.title,
          summaryTypeface: input.typefaces.summary,
          bodyTypeface: input.typefaces.body,
          sources: { create: input.sources.map((value, position) => ({ value, position })) },
          images: { create: imageKeys.map((storageKey, position) => ({ storageKey, position })) },
          video: video ? { create: video } : undefined,
          // SPEC §7: an opinion gets its editor's answer choices, or the default ones.
          voteOptions:
            input.kind === "OPINION"
              ? {
                  create: (input.voteOptions ?? DEFAULT_VOTE_OPTIONS).map((label, position) => ({
                    label,
                    position,
                  })),
                }
              : undefined,
        },
        include: POST_INCLUDE,
      });
      // docs/DECISIONS.md (push notifications): the readers with a matching alert.
      this.notifications.fireAndForget(this.notifications.notifyNewPost(post));
      return await this.toPublic(post, author.id);
    } catch (error) {
      // The post was not saved: its images and video must not stay in storage.
      await this.storage.delete(imageKeys);
      await this.videos.remove(video);
      throw error;
    }
  }

  /**
   * SPEC §4.1 and §4.3: posts of the last 48 hours (or 24 with `today`), newest first, with the
   * zone and theme filters, without the authors the reader blocked (SPEC §10).
   * Votes never play a part in the order (SPEC §7). « À la une » is the weighted feed (§4.2).
   */
  async feed(
    viewer: AuthUser | null,
    query: PostQuery,
    now: Date = new Date(),
  ): Promise<Paginated<PostSummaryPublic>> {
    const blockedIds = viewer ? await this.blockedAuthorIds(viewer.id) : [];
    if (query.sort === "WEIGHTED") {
      return this.weightedFeed.page(query, blockedIds, now);
    }
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.post.findMany({
      where: {
        createdAt: { gte: feedWindowStart(now, query.today) },
        // docs/DECISIONS.md: an opinion removed by moderation leaves the feed.
        removedAt: null,
        zone: query.zone,
        // docs/DECISIONS.md (places): a region covers its cities.
        locality: query.locality ? { in: localitiesWithin(query.locality) } : undefined,
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
      // The body is read for the excerpt of the card (docs/DECISIONS.md, interface brief).
      include: POST_INCLUDE,
    });
    const page = toPage(rows, query.limit, (row) => row);
    return { items: page.rows.map(toPostSummaryPublic), nextCursor: page.nextCursor };
  }

  /**
   * A full post, reachable by direct link even after 48 hours (SPEC §4.1). Counts the reader
   * once (SPEC §3): one view per account, or per session for anonymous visitors; the author's
   * own views do not count (docs/DECISIONS.md).
   */
  async findOne(
    viewer: AuthUser | null,
    postId: string,
    sessionId: string | null,
  ): Promise<PostPublic> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: POST_INCLUDE,
    });
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    // docs/DECISIONS.md: a removed opinion is no longer shown, even by direct link.
    if (post.removedAt) {
      throw new ApiException(HttpStatus.GONE, "POST_REMOVED", "Removed by moderation");
    }
    if (viewer?.id !== post.authorId) {
      await this.recordView(
        postId,
        viewer ? { userId: viewer.id } : sessionId ? { sessionId } : null,
      );
    }
    return this.toPublic(post, viewer?.id ?? null);
  }

  /** All the publications of an editor, newest first (SPEC §2.2: public profile). */
  async listByEditor(editorId: string, query: CursorQuery): Promise<Paginated<PostSummaryPublic>> {
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.post.findMany({
      where: {
        authorId: editorId,
        removedAt: null,
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
    });
    const page = toPage(rows, query.limit, (row) => row);
    return { items: page.rows.map(toPostSummaryPublic), nextCursor: page.nextCursor };
  }

  /** An image of a post, read from private storage (docs/DECISIONS.md: served by the API). */
  async readImage(postId: string, imageId: string): Promise<StoredObject> {
    const image = await this.prisma.postImage.findFirst({ where: { id: imageId, postId } });
    if (!image) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such image");
    }
    return this.storage.get(image.storageKey);
  }

  private async recordView(
    postId: string,
    viewer: { userId: string } | { sessionId: string } | null,
  ): Promise<void> {
    if (!viewer) {
      // Neither an account nor a session: the view cannot be deduplicated, so it is not counted.
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      // The unique keys (post, user) and (post, session) skip a reader already counted.
      const created = await tx.postView.createMany({
        data: [{ postId, ...viewer }],
        skipDuplicates: true,
      });
      if (created.count === 1) {
        await tx.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } });
      }
    });
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
      return this.toPublic(post, editor.id);
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
    return this.toPublic(post, editor.id);
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
