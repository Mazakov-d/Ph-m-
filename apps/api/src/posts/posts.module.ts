import { Module } from "@nestjs/common";
import { EditorPostsController } from "./editor-posts.controller.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";

@Module({
  controllers: [PostsController, EditorPostsController],
  providers: [PostsService],
})
export class PostsModule {}
