import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { JuryController } from "./jury.controller.js";
import { JuryService } from "./jury.service.js";
import { JuryTimeoutJob } from "./jury-timeout.job.js";

/** SPEC §5.8: community review by a jury of readers drawn at random. */
@Module({
  imports: [NotificationsModule],
  controllers: [JuryController],
  providers: [JuryService, JuryTimeoutJob],
  exports: [JuryService],
})
export class JuryModule {}
