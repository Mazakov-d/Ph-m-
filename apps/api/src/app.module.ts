import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [PrismaModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
