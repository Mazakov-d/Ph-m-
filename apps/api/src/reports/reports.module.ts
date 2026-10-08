import { Module } from "@nestjs/common";
import { JuryModule } from "../jury/jury.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { CommentReportsService } from "./comment-reports.service.js";
import { PostReportsService } from "./post-reports.service.js";
import { ReportsController } from "./reports.controller.js";

@Module({
  imports: [NotificationsModule, JuryModule],
  controllers: [ReportsController],
  providers: [PostReportsService, CommentReportsService],
})
export class ReportsModule {}
