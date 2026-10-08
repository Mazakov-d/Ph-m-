import { Module } from "@nestjs/common";
import { SanctionsController } from "./sanctions.controller.js";
import { SanctionsService } from "./sanctions.service.js";

@Module({
  controllers: [SanctionsController],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
