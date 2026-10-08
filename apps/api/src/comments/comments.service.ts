import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser, CommentPublic, CommentStatus, CreateCommentInput } from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toCommentPublic } from "./comments.mapper.js";
import { ToxicityChecker } from "./toxicity/toxicity-checker.js";

const WITH_AUTHOR = { author: { select: { pseudo: true } } } as const;

// docs/DECISIONS.md: one can reply to a comment shown to everyone.
const REPLYABLE_STATUSES: CommentStatus[] = ["VISIBLE", "VERIFIED"];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toxicityChecker: ToxicityChecker,
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
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: input.postId } });
      if (!post) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
      }
      if (!post.commentsEnabled) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "COMMENTS_DISABLED",
          "Comments are disabled on this post",
        );
      }
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
      return toCommentPublic(comment);
    });
  }
}
