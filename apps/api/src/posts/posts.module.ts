import { NotificationsModule } from "../notifications/notifications.module.js";
import { Module } from "@nestjs/common";
import { EditorReliabilityModule } from "../reliability/editor-reliability.module.js";
import { VotesModule } from "../votes/votes.module.js";
import { EditorPostsController } from "./editor-posts.controller.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";
import { PostVideosService } from "./post-videos.service.js";
import { SimilarPostsService } from "./similar-posts.service.js";
import { WeightedFeedService } from "./weighted-feed.service.js";

@Module({
  imports: [NotificationsModule, VotesModule, EditorReliabilityModule],
  controllers: [PostsController, EditorPostsController],
  providers: [PostsService, WeightedFeedService, SimilarPostsService, PostVideosService],
})
export class PostsModule {}
