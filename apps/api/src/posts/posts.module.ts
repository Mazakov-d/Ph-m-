import { Module } from "@nestjs/common";
import { VotesModule } from "../votes/votes.module.js";
import { EditorPostsController } from "./editor-posts.controller.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";
import { WeightedFeedService } from "./weighted-feed.service.js";

@Module({
  imports: [VotesModule],
  controllers: [PostsController, EditorPostsController],
  providers: [PostsService, WeightedFeedService],
})
export class PostsModule {}
