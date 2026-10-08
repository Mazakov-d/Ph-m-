import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  EDITOR_APPEAL_HOURS,
  EDITOR_REPLY_HOURS,
  isWithinEditorWindow,
  type PostCorrectionPublic,
  type ReviewPublic,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { type ReviewRecord, toReviewPublic } from "./reviews.mapper.js";

/** Public « Pourquoi ? » and the editor's answers to a verdict (SPEC §5.5, docs/DECISIONS.md). */
@Injectable()
export class PostReviewEditorService {
  constructor(private readonly prisma: PrismaService) {}

  /** SPEC §5.6: the latest verdict of an article, with the editor's reply. */
  async publicReview(postId: string): Promise<ReviewPublic> {
    const review = await this.latestReview(postId);
    return toReviewPublic(review, await this.appealState(postId));
  }

  /** SPEC §5.5: one reply per verdict, within EDITOR_REPLY_HOURS. */
  async reply(editor: AuthUser, postId: string, content: string): Promise<ReviewPublic> {
    const review = await this.reviewOfOwnPost(
      editor,
      postId,
      EDITOR_REPLY_HOURS,
      "REPLY_WINDOW_CLOSED",
    );
    try {
      await this.prisma.editorReply.create({
        data: { reviewId: review.id, authorId: editor.id, content },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REPLIED", "Already replied");
      }
      throw error;
    }
    return this.publicReview(postId);
  }

  /**
   * SPEC §3 + docs/DECISIONS.md: the editor corrects their own post at any time, before or after
   * a verdict; the correction shows publicly under it (SPEC §5.7: before a verdict, it halves the
   * penalty of the gauge).
   */
  async correct(editor: AuthUser, postId: string, content: string): Promise<PostCorrectionPublic> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, removedAt: true },
    });
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    if (post.authorId !== editor.id) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your post");
    }
    // docs/DECISIONS.md: nothing happens any more on a removed opinion.
    if (post.removedAt) {
      throw new ApiException(HttpStatus.GONE, "POST_REMOVED", "Removed by moderation");
    }
    const correction = await this.prisma.postCorrection.create({ data: { postId, content } });
    return {
      id: correction.id,
      content: correction.content,
      createdAt: correction.createdAt.toISOString(),
    };
  }

  /** SPEC §5.5: a single appeal per post, within EDITOR_APPEAL_HOURS of the verdict. */
  async appeal(editor: AuthUser, postId: string, reason: string): Promise<ReviewPublic> {
    const review = await this.reviewOfOwnPost(
      editor,
      postId,
      EDITOR_APPEAL_HOURS,
      "APPEAL_WINDOW_CLOSED",
    );
    // One appeal per post: neither twice on a verdict, nor on the verdict given on appeal.
    if ((await this.appealState(postId)) !== "NONE") {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "APPEAL_ALREADY_USED",
        "The appeal was already used",
      );
    }
    try {
      await this.prisma.appeal.create({
        data: { appellantId: editor.id, reviewId: review.id, reason },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "APPEAL_ALREADY_USED",
          "The appeal was already used",
        );
      }
      throw error;
    }
    return this.publicReview(postId);
  }

  private async latestReview(postId: string): Promise<ReviewRecord> {
    const review = await this.prisma.review.findFirst({
      where: { postId },
      orderBy: { createdAt: "desc" },
      include: { editorReply: true },
    });
    if (!review) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "This post has no verdict");
    }
    return review;
  }

  private async appealState(postId: string): Promise<ReviewPublic["appealState"]> {
    const appeal = await this.prisma.appeal.findFirst({ where: { review: { postId } } });
    if (!appeal) return "NONE";
    return appeal.resolvedAt ? "DECIDED" : "PENDING";
  }

  /** The latest verdict of the editor's own post, if the window after it is still open. */
  private async reviewOfOwnPost(
    editor: AuthUser,
    postId: string,
    windowHours: number,
    closedCode: "REPLY_WINDOW_CLOSED" | "APPEAL_WINDOW_CLOSED",
  ): Promise<ReviewRecord> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such post");
    }
    if (post.authorId !== editor.id) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your post");
    }
    const review = await this.latestReview(postId);
    if (!isWithinEditorWindow(review.createdAt, new Date(), windowHours)) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        closedCode,
        "The delay after the verdict is over",
      );
    }
    return review;
  }
}
