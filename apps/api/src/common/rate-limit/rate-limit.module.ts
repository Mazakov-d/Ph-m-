import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

/**
 * docs/DECISIONS.md: rate limits, set route by route with @RateLimit(); in-memory counters.
 * RATE_LIMITS_ENABLED=false turns them off (the tests do, except the one testing them).
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 1000 }],
      skipIf: () => process.env.RATE_LIMITS_ENABLED === "false",
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
