import { Module } from "@nestjs/common";
import { SanctionsModule } from "../sanctions/sanctions.module.js";
import { CommentModerationService } from "./comment-moderation.service.js";
import { ModerationController } from "./moderation.controller.js";
import { PostModerationService } from "./post-moderation.service.js";

@Module({
  imports: [SanctionsModule],
  controllers: [ModerationController],
  providers: [CommentModerationService, PostModerationService],
})
export class ModerationModule {}
