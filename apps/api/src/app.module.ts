import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { EditorsModule } from "./editors/editors.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { HealthModule } from "./health/health.module.js";
import { PostsModule } from "./posts/posts.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { StorageModule } from "./storage/storage.module.js";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    EditorsModule,
    PostsModule,
    CommentsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
