import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import {
  type AuthUser,
  type CommentPublic,
  type CommentThreadPublic,
  type CreateCommentInput,
  createCommentInputSchema,
  type CursorQuery,
  cursorQuerySchema,
  idSchema,
  type Paginated,
  RATE_LIMIT_COMMENT,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { OptionalUser } from "../common/decorators/current-user.decorator.js";
import { OptionalAuth } from "../common/decorators/optional-auth.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { RateLimit } from "../common/rate-limit/rate-limit.js";
import { CommentsService } from "./comments.service.js";

// SPEC §6: comments are never edited, so there is no update route (ROADMAP phase 5).
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @RateLimit(RATE_LIMIT_COMMENT)
  @Post("comments")
  @RequirePermission("comment.create")
  create(
    @Body(new ZodValidationPipe(createCommentInputSchema)) input: CreateCommentInput,
    @CurrentUser() author: AuthUser,
  ): Promise<CommentPublic> {
    return this.commentsService.create(author, input);
  }

  // SPEC §2: readable without an account; a signed-in reader does not see whom they blocked.
  @Get("posts/:postId/comments")
  @OptionalAuth()
  listForPost(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
    @OptionalUser() viewer: AuthUser | null,
  ): Promise<Paginated<CommentThreadPublic>> {
    return this.commentsService.listForPost(viewer, postId, query);
  }

  // No permission required: a suspended account may delete its own comments (docs/DECISIONS.md).
  @Delete("comments/:id")
  delete(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() author: AuthUser,
  ): Promise<CommentPublic> {
    return this.commentsService.deleteByAuthor(author, id);
  }
}
