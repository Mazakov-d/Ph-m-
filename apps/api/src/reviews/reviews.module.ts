import { NotificationsModule } from "../notifications/notifications.module.js";
import { Module } from "@nestjs/common";
import { PostReviewEditorService } from "./post-review-editor.service.js";
import { ReviewsController } from "./reviews.controller.js";
import { ReviewsService } from "./reviews.service.js";

@Module({
  imports: [NotificationsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, PostReviewEditorService],
})
export class ReviewsModule {}
