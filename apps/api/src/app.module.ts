import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { EditorsModule } from "./editors/editors.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module.js";
import { HealthModule } from "./health/health.module.js";
import { ModerationModule } from "./moderation/moderation.module.js";
import { PostsModule } from "./posts/posts.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { RetentionModule } from "./retention/retention.module.js";
import { ReviewsModule } from "./reviews/reviews.module.js";
import { SanctionsModule } from "./sanctions/sanctions.module.js";
import { SearchModule } from "./search/search.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { TicketsModule } from "./tickets/tickets.module.js";
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
    TicketsModule,
    AuditModule,
    SearchModule,
    RetentionModule,
    // Scheduled jobs (CLAUDE.md §5.3): ticket timeouts, later the retention purge.
    ScheduleModule.forRoot(),
    RateLimitModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
