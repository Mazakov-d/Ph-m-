import { Module } from "@nestjs/common";
import { CommentReportsService } from "./comment-reports.service.js";
import { PostReportsService } from "./post-reports.service.js";
import { ReportsController } from "./reports.controller.js";

@Module({
  controllers: [ReportsController],
  providers: [PostReportsService, CommentReportsService],
})
export class ReportsModule {}
