import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { EditorsModule } from "./editors/editors.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { HealthModule } from "./health/health.module.js";
import { ModerationModule } from "./moderation/moderation.module.js";
import { PostsModule } from "./posts/posts.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { ReviewsModule } from "./reviews/reviews.module.js";
import { SanctionsModule } from "./sanctions/sanctions.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { UsersModule } from "./users/users.module.js";
import { VotesModule } from "./votes/votes.module.js";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    EditorsModule,
    PostsModule,
    CommentsModule,
    VotesModule,
    ReportsModule,
    ReviewsModule,
    SanctionsModule,
    ModerationModule,
    UsersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
