import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ConversationEvents } from "./conversation-events.js";
import { ConversationsGateway } from "./conversations.gateway.js";
import { TicketTimeoutJob } from "./ticket-timeout.job.js";
import { TicketsController } from "./tickets.controller.js";
import { TicketsService } from "./tickets.service.js";

@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketTimeoutJob, ConversationEvents, ConversationsGateway],
})
export class TicketsModule {}
