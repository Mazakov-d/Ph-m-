import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CommentPublic,
  CommentStatus,
  CommentThreadPublic,
  CreateCommentInput,
  CursorQuery,
  Paginated,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { decodeCursor, toPage } from "../common/pagination/cursor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { toCommentPublic } from "./comments.mapper.js";
import { ToxicityChecker } from "./toxicity/toxicity-checker.js";

const WITH_AUTHOR = { author: { select: { pseudo: true } } } as const;

// docs/DECISIONS.md: one can reply to a comment shown to everyone.
const REPLYABLE_STATUSES: CommentStatus[] = ["VISIBLE", "VERIFIED"];
// docs/DECISIONS.md: the author deletes a comment shown to everyone, never one under review.
const DELETABLE_STATUSES: CommentStatus[] = ["VISIBLE", "VERIFIED"];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toxicityChecker: ToxicityChecker,
    private readonly notifications: NotificationsService,
  ) {}

  /** SPEC §6: a comment, or a reply to a root comment (one level). */
  async create(author: AuthUser, input: CreateCommentInput): Promise<CommentPublic> {
    // SPEC §6.2 step 1: a blocked comment is not saved. docs/DECISIONS.md: the message stays
    // generic and never reveals the term found.
    const verdict = await this.toxicityChecker.check(input.content);
    if (verdict.blocked) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "TOXIC_CONTENT",
        "The comment contains a term forbidden by the community rules",
      );
    }
    const { created, rootAuthorId } = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: input.postId } });
      if (!post) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
      }
      // docs/DECISIONS.md: nothing happens any more on a removed opinion.
      if (post.removedAt) {
        throw new ApiException(HttpStatus.GONE, "POST_REMOVED", "Removed by moderation");
      }
      if (!post.commentsEnabled) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "COMMENTS_DISABLED",
          "Comments are disabled on this post",
        );
      }
      let threadAuthorId: string | null = null;
      if (input.parentId) {
        const parent = await tx.comment.findUnique({ where: { id: input.parentId } });
        const isValidParent =
          parent !== null &&
          parent.postId === input.postId &&
          parent.parentId === null &&
          REPLYABLE_STATUSES.includes(parent.status);
        if (!isValidParent) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_PARENT_COMMENT",
            "A reply must answer a visible root comment of the same post",
          );
        }
        threadAuthorId = parent.authorId;
      }
      const comment = await tx.comment.create({
        data: {
          postId: input.postId,
          parentId: input.parentId,
          authorId: author.id,
          content: input.content,
        },
        include: WITH_AUTHOR,
      });
      return { created: toCommentPublic(comment), rootAuthorId: threadAuthorId };
    });
    // docs/DECISIONS.md (push notifications): the author of the thread hears about the reply.
    if (rootAuthorId) {
      this.notifications.fireAndForget(
        this.notifications.notifyCommentReply(rootAuthorId, {
          authorId: author.id,
          authorPseudo: created.authorPseudo,
          content: created.content ?? "",
          postId: input.postId,
        }),
      );
    }
    return created;
  }

  /**
   * SPEC §6: the comments of a post by ascending date, as threads (docs/DECISIONS.md): a page of
   * root comments, each with all its replies. Hidden comments keep their place with a null
   * content, so their replies stay readable. docs/DECISIONS.md: a comment deleted by its author
   * is no longer sent (it stays in the database), and neither are the replies to it.
   */
  async listForPost(
    viewer: AuthUser | null,
    postId: string,
    query: CursorQuery,
  ): Promise<Paginated<CommentThreadPublic>> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    // SPEC §10 + docs/DECISIONS.md: the threads and replies of blocked accounts are not sent.
    const blockedIds = viewer
      ? (
          await this.prisma.block.findMany({
            where: { blockerId: viewer.id },
            select: { blockedId: true },
          })
        ).map((block) => block.blockedId)
      : [];
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const roots = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
        authorId: { notIn: blockedIds },
        status: { not: "DELETED" },
        ...(after && {
          OR: [
            { createdAt: { gt: after.createdAt } },
            { createdAt: after.createdAt, id: { gt: after.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      include: {
        ...WITH_AUTHOR,
        replies: {
          where: { authorId: { notIn: blockedIds }, status: { not: "DELETED" } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: WITH_AUTHOR,
        },
      },
    });
    const page = toPage(roots, query.limit, (root) => root);
    return {
      items: page.rows.map((root) => ({
        ...toCommentPublic(root),
        replies: root.replies.map(toCommentPublic),
      })),
      nextCursor: page.nextCursor,
    };
  }

  /**
   * SPEC §6: the author deletes their comment, always logically (deletedAt, deletedBy), never
   * while it is under review. The status check and the deletion are one conditional update, so
   * a comment going UNDER_REVIEW at the same moment can never end up deleted (CLAUDE.md §5.3).
   * docs/DECISIONS.md: allowed to a suspended account too.
   */
  async deleteByAuthor(author: AuthUser, commentId: string): Promise<CommentPublic> {
    const deleted = await this.prisma.comment.updateMany({
      where: { id: commentId, authorId: author.id, status: { in: DELETABLE_STATUSES } },
      data: { status: "DELETED", deletedAt: new Date(), deletedBy: "AUTHOR" },
    });
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: WITH_AUTHOR,
    });
    if (deleted.count === 1 && comment) {
      return toCommentPublic(comment);
    }
    // Nothing was deleted: explain why.
    if (!comment) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such comment");
    }
    if (comment.authorId !== author.id) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your comment");
    }
    if (comment.status === "UNDER_REVIEW") {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "COMMENT_UNDER_REVIEW",
        "A comment under review cannot be deleted",
      );
    }
    throw new ApiException(
      HttpStatus.CONFLICT,
      "INVALID_STATUS_TRANSITION",
      `A ${comment.status} comment cannot be deleted`,
    );
  }
}
