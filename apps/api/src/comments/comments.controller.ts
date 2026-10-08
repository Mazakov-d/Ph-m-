import { Body, Controller, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CommentPublic,
  type CreateCommentInput,
  createCommentInputSchema,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
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
}
