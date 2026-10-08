import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  type AuthUser,
  type CreatePostReportInput,
  createPostReportInputSchema,
  idSchema,
  type ReportPublic,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { PostReportsService } from "./post-reports.service.js";

@Controller("posts/:postId/reports")
export class PostReportsController {
  constructor(private readonly postReportsService: PostReportsService) {}

  @Post()
  @RequirePermission("report.create")
  report(
    @Param("postId", new ZodValidationPipe(idSchema)) postId: string,
    @Body(new ZodValidationPipe(createPostReportInputSchema)) input: CreatePostReportInput,
    @CurrentUser() reporter: AuthUser,
  ): Promise<ReportPublic> {
    return this.postReportsService.report(reporter, postId, input);
  }
}
