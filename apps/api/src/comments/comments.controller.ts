import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
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
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { CommentsService } from "./comments.service.js";

// SPEC §6: comments are never edited, so there is no update route (ROADMAP phase 5).
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post("comments")
  @RequirePermission("comment.create")
  create(
    @Body(new ZodValidationPipe(createCommentInputSchema)) input: CreateCommentInput,
    @CurrentUser() author: AuthUser,
  ): Promise<CommentPublic> {
    return this.commentsService.create(author, input);
  }

  // SPEC §2: readable without an account.
  @Get("posts/:postId/comments")
  @Public()
  listForPost(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<Paginated<CommentThreadPublic>> {
    return this.commentsService.listForPost(postId, query);
  }
}
