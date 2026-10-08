import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  type AuthUser,
  type CreateEditorChatInput,
  createEditorChatInputSchema,
  type CreateMessageInput,
  createMessageInputSchema,
  idSchema,
  type MessagePublic,
  type TicketModeration,
  type TicketPublic,
  type TicketQuery,
  ticketQuerySchema,
} from "@fama/shared";
import { CurrentUser } from "../common/decorators/current-user.decorator.js";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { TicketsService } from "./tickets.service.js";

const idPipe = () => new ZodValidationPipe(idSchema);

// SPEC §8: messages are never edited nor deleted: there is no such route.
@Controller()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post("tickets")
  @RequirePermission("support.open")
  openSupport(
    @Body(new ZodValidationPipe(createMessageInputSchema)) input: CreateMessageInput,
    @CurrentUser() user: AuthUser,
  ): Promise<TicketPublic> {
    return this.tickets.openSupport(user, input.content);
  }

  @Get("tickets/mine")
  mine(@CurrentUser() user: AuthUser): Promise<TicketPublic[]> {
    return this.tickets.mine(user);
  }

  @Get("tickets/:id/messages")
  messages(
    @Param("id", idPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<MessagePublic[]> {
    return this.tickets.messages(user, id);
  }

  @Post("tickets/:id/messages")
  post(
    @Param("id", idPipe()) id: string,
    @Body(new ZodValidationPipe(createMessageInputSchema)) input: CreateMessageInput,
    @CurrentUser() user: AuthUser,
  ): Promise<MessagePublic> {
    return this.tickets.post(user, id, input.content);
  }

  @Post("moderation/editor-chats")
  @RequirePermission("ticket.assign")
  openEditorChat(
    @Body(new ZodValidationPipe(createEditorChatInputSchema)) input: CreateEditorChatInput,
    @CurrentUser() moderator: AuthUser,
  ): Promise<TicketModeration> {
    return this.tickets.openEditorChat(moderator, input.editorId, input.content);
  }

  @Get("moderation/tickets")
  @RequirePermission("ticket.assign")
  forModerator(
    @Query(new ZodValidationPipe(ticketQuerySchema)) query: TicketQuery,
    @CurrentUser() moderator: AuthUser,
  ): Promise<TicketModeration[]> {
    return this.tickets.forModerator(moderator, query);
  }

  @Post("moderation/tickets/:id/assign")
  @RequirePermission("ticket.assign")
  assign(
    @Param("id", idPipe()) id: string,
    @CurrentUser() moderator: AuthUser,
  ): Promise<TicketModeration> {
    return this.tickets.assign(moderator, id);
  }

  @Post("moderation/tickets/:id/close")
  @RequirePermission("ticket.assign")
  close(
    @Param("id", idPipe()) id: string,
    @CurrentUser() moderator: AuthUser,
  ): Promise<TicketModeration> {
    return this.tickets.close(moderator, id);
  }

  @Get("admin/tickets")
  @RequirePermission("chat.readAll")
  all(): Promise<TicketModeration[]> {
    return this.tickets.all();
  }
}
