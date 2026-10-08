import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  type AppealModeration,
  type AuthUser,
  type CreateAppealInput,
  createAppealInputSchema,
  type CreateEditorReplyInput,
  createEditorReplyInputSchema,
  type CreatePostCorrectionInput,
  createPostCorrectionInputSchema,
  type CreateReviewInput,
  createReviewInputSchema,
  idSchema,
  type PostCorrectionPublic,
  type ReviewPublic,
  type ReviewQueueItemModeration,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { Public } from "../common/decorators/public.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { PostReviewEditorService } from "./post-review-editor.service.js";
import { ReviewsService } from "./reviews.service.js";

const idPipe = () => new ZodValidationPipe(idSchema);

@Controller()
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly editorService: PostReviewEditorService,
  ) {}

  // ─── Moderation (SPEC §5.4, §5.5) ───

  @Get("moderation/post-reviews")
  @RequirePermission("moderation.queue.read")
  queue(@CurrentUser() moderator: AuthUser): Promise<ReviewQueueItemModeration[]> {
    return this.reviewsService.queue(moderator);
  }

  @Post("moderation/post-reviews/:postId/verdict")
  @RequirePermission("moderation.decide")
  decide(
    @Param("postId", idPipe()) postId: string,
    @Body(new ZodValidationPipe(createReviewInputSchema)) input: CreateReviewInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<ReviewPublic> {
    return this.reviewsService.decide(moderator, postId, input);
  }

  @Get("moderation/appeals")
  @RequirePermission("moderation.queue.read")
  appeals(@CurrentUser() moderator: AuthUser): Promise<AppealModeration[]> {
    return this.reviewsService.appeals(moderator);
  }

  @Post("moderation/appeals/:appealId/decision")
  @RequirePermission("moderation.decide")
  decideAppeal(
    @Param("appealId", idPipe()) appealId: string,
    @Body(new ZodValidationPipe(createReviewInputSchema)) input: CreateReviewInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<ReviewPublic> {
    return this.reviewsService.decideAppeal(moderator, appealId, input);
  }

  // ─── Public and editor side (SPEC §5.5, §5.6) ───

  // SPEC §2: readable without an account (« Pourquoi ? »).
  @Get("posts/:postId/review")
  @Public()
  publicReview(@Param("postId", idPipe()) postId: string): Promise<ReviewPublic> {
    return this.editorService.publicReview(postId);
  }

  // Editor actions are publishing actions: validated, non-suspended editors (post.create).
  @Post("posts/:postId/review/reply")
  @RequirePermission("post.create")
  reply(
    @Param("postId", idPipe()) postId: string,
    @Body(new ZodValidationPipe(createEditorReplyInputSchema)) input: CreateEditorReplyInput,
    @CurrentUser() editor: AuthUser,
  ): Promise<ReviewPublic> {
    return this.editorService.reply(editor, postId, input.content);
  }

  @Post("posts/:postId/corrections")
  @RequirePermission("post.create")
  correct(
    @Param("postId", idPipe()) postId: string,
    @Body(new ZodValidationPipe(createPostCorrectionInputSchema)) input: CreatePostCorrectionInput,
    @CurrentUser() editor: AuthUser,
  ): Promise<PostCorrectionPublic> {
    return this.editorService.correct(editor, postId, input.content);
  }

  @Post("posts/:postId/review/appeal")
  @RequirePermission("post.create")
  appeal(
    @Param("postId", idPipe()) postId: string,
    @Body(new ZodValidationPipe(createAppealInputSchema)) input: CreateAppealInput,
    @CurrentUser() editor: AuthUser,
  ): Promise<ReviewPublic> {
    return this.editorService.appeal(editor, postId, input.reason);
  }
}
