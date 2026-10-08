import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_TTL_MINUTES } from "@fama/shared";
import { PermissionGuard } from "../common/guards/permission.guard.js";
import { requireEnv } from "../config/env.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { ModeratorsController } from "./moderators.controller.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m` },
      }),
    }),
  ],
  controllers: [AuthController, ModeratorsController],
  providers: [
    AuthService,
    // Global guards, in this order: authenticate, then authorize.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
