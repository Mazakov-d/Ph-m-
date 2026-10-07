import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_TTL_MINUTES } from "@fama/shared";
import { requireEnv } from "../config/env.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
