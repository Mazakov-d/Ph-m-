import { NotificationsModule } from "../notifications/notifications.module.js";
import { Module } from "@nestjs/common";
import { TicketTimeoutJob } from "./ticket-timeout.job.js";
import { TicketsController } from "./tickets.controller.js";
import { TicketsService } from "./tickets.service.js";

@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketTimeoutJob],
})
export class TicketsModule {}
