import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CommentDecisionInput,
  commentDecisionInputSchema,
  type CommentModeration,
  idSchema,
  type ModerationDecisionResult,
  type PostModerationDecisionInput,
  postModerationDecisionInputSchema,
  type ReviewQueueItemModeration,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { CommentModerationService } from "./comment-moderation.service.js";
import { PostModerationService } from "./post-moderation.service.js";

@Controller("moderation")
export class ModerationController {
  constructor(
    private readonly comments: CommentModerationService,
    private readonly posts: PostModerationService,
  ) {}

  @Get("comments")
  @RequirePermission("moderation.queue.read")
  commentQueue(@CurrentUser() moderator: AuthUser): Promise<CommentModeration[]> {
    return this.comments.queue(moderator);
  }

  @Post("comments/:id/decision")
  @RequirePermission("moderation.decide")
  decideComment(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(commentDecisionInputSchema)) input: CommentDecisionInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<ModerationDecisionResult> {
    return this.comments.decide(moderator, id, input);
  }

  @Get("posts")
  @RequirePermission("moderation.queue.read")
  postQueue(@CurrentUser() moderator: AuthUser): Promise<ReviewQueueItemModeration[]> {
    return this.posts.queue(moderator);
  }

  @Post("posts/:id/decision")
  @RequirePermission("moderation.decide")
  decidePost(
    @Param("id", new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(postModerationDecisionInputSchema))
    input: PostModerationDecisionInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<ModerationDecisionResult> {
    return this.posts.decide(moderator, id, input);
  }
}
