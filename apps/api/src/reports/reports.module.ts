import { Module } from "@nestjs/common";
import { PostReportsController } from "./post-reports.controller.js";
import { PostReportsService } from "./post-reports.service.js";

@Module({
  controllers: [PostReportsController],
  providers: [PostReportsService],
})
export class ReportsModule {}
