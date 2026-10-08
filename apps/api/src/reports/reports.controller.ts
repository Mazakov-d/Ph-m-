import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CreateCommentReportInput,
  createCommentReportInputSchema,
  type CreatePostReportInput,
  createPostReportInputSchema,
  idSchema,
  type ReportPublic,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { CommentReportsService } from "./comment-reports.service.js";
import { PostReportsService } from "./post-reports.service.js";

@Controller()
export class ReportsController {
  constructor(
    private readonly postReportsService: PostReportsService,
    private readonly commentReportsService: CommentReportsService,
  ) {}

  @Post("posts/:postId/reports")
  @RequirePermission("report.create")
  report(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @Body(new ZodValidationPipe(createPostReportInputSchema)) input: CreatePostReportInput,
    @CurrentUser() reporter: AuthUser,
  ): Promise<ReportPublic> {
    return this.postReportsService.report(reporter, postId, input);
  }

  @Post("comments/:commentId/reports")
  @RequirePermission("report.create")
  reportComment(
    @Param("commentId", new ZodValidationPipe(idSchema)) commentId: string,
    @Body(new ZodValidationPipe(createCommentReportInputSchema)) input: CreateCommentReportInput,
    @CurrentUser() reporter: AuthUser,
  ): Promise<ReportPublic> {
    return this.commentReportsService.report(reporter, commentId, input);
  }
}
