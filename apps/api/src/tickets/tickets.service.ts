import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  can,
  type MessagePublic,
  type TicketModeration,
  type TicketPublic,
  type TicketQuery,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import type { Ticket } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  TICKET_INCLUDE,
  toMessagePublic,
  toTicketModeration,
  toTicketPublic,
} from "./tickets.mapper.js";

const WITH_AUTHOR = { author: { select: { pseudo: true, role: true } } } as const;

/** SPEC §8: support tickets and editor chats. */
@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /** « Parler à l'équipe »: a SUPPORT ticket with its first message. */
  async openSupport(user: AuthUser, content: string): Promise<TicketPublic> {
    const ticket = await this.prisma.ticket.create({
      data: {
        kind: "SUPPORT",
        openedById: user.id,
        messages: { create: { authorId: user.id, content } },
      },
    });
    return toTicketPublic(ticket);
  }

  /** A moderator opens a chat with a validated editor; it is assigned to them at once. */
  async openEditorChat(
    moderator: AuthUser,
    editorId: string,
    content: string,
  ): Promise<TicketModeration> {
    const editor = await this.prisma.user.findUnique({
      where: { id: editorId },
      include: { editorProfile: true },
    });
    const isValidatedEditor =
      editor?.role === "EDITOR" &&
      (editor.editorProfile?.status === "INDEPENDENT" ||
        editor.editorProfile?.status === "CERTIFIED");
    if (!isValidatedEditor) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Not a validated editor");
    }
    const now = new Date();
    const ticket = await this.prisma.ticket.create({
      data: {
        kind: "EDITOR_CHAT",
        status: "ASSIGNED",
        openedById: moderator.id,
        editorId,
        assignedModeratorId: moderator.id,
        assignedAt: now,
        lastModeratorMessageAt: now,
        messages: { create: { authorId: moderator.id, content } },
      },
      include: TICKET_INCLUDE,
    });
    return toTicketModeration(ticket);
  }

  /** The tickets the account takes part in as a reader or an editor. */
  async mine(user: AuthUser): Promise<TicketPublic[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        OR: [
          { kind: "SUPPORT", openedById: user.id },
          { kind: "EDITOR_CHAT", editorId: user.id },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
    });
    return tickets.map(toTicketPublic);
  }

  /** SPEC §8: NEW tickets for every moderator, or the moderator's own. Never another's. */
  async forModerator(moderator: AuthUser, query: TicketQuery): Promise<TicketModeration[]> {
    const tickets = await this.prisma.ticket.findMany({
      where:
        query.scope === "unassigned"
          ? { status: "NEW" }
          : { assignedModeratorId: moderator.id, status: { not: "CLOSED" } },
      orderBy: { createdAt: "asc" },
      include: TICKET_INCLUDE,
    });
    return tickets.map(toTicketModeration);
  }

  /** SPEC §2.4: an admin sees every conversation. */
  async all(): Promise<TicketModeration[]> {
    const tickets = await this.prisma.ticket.findMany({
      orderBy: { lastMessageAt: "desc" },
      include: TICKET_INCLUDE,
    });
    return tickets.map(toTicketModeration);
  }

  /** SPEC §8: atomic assignment, two moderators clicking at once → only one wins. */
  async assign(moderator: AuthUser, ticketId: string): Promise<TicketModeration> {
    const now = new Date();
    const assigned = await this.prisma.ticket.updateMany({
      where: { id: ticketId, status: "NEW" },
      data: {
        status: "ASSIGNED",
        assignedModeratorId: moderator.id,
        assignedAt: now,
        lastModeratorMessageAt: null,
      },
    });
    if (assigned.count !== 1) {
      throw new ApiException(HttpStatus.CONFLICT, "TICKET_ALREADY_ASSIGNED", "Already assigned");
    }
    return toTicketModeration(
      await this.prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
        include: TICKET_INCLUDE,
      }),
    );
  }

  /** Closed by the assigned moderator or an admin; no message afterwards. */
  async close(moderator: AuthUser, ticketId: string): Promise<TicketModeration> {
    const ticket = await this.findTicket(ticketId);
    if (ticket.assignedModeratorId !== moderator.id && !can(moderator, "chat.readAll")) {
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your ticket");
    }
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return toTicketModeration(
      await this.prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId },
        include: TICKET_INCLUDE,
      }),
    );
  }

  /** The conversation; an admin's reading of a conversation they do not take part in is audited. */
  async messages(user: AuthUser, ticketId: string): Promise<MessagePublic[]> {
    const ticket = await this.findTicket(ticketId);
    if (!this.isParticipant(user, ticket)) {
      if (!can(user, "chat.readAll")) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such ticket");
      }
      // SPEC §2.4 and §8: every reading of a chat by an ADMIN is audited.
      await this.prisma.auditLog.create({
        data: { actorId: user.id, action: "ticket.read", targetType: "Ticket", targetId: ticketId },
      });
    }
    const messages = await this.prisma.message.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: WITH_AUTHOR,
    });
    return messages.map(toMessagePublic);
  }

  /** SPEC §8: append-only messages, by the participants of an open ticket. */
  async post(user: AuthUser, ticketId: string, content: string): Promise<MessagePublic> {
    const ticket = await this.findTicket(ticketId);
    if (!this.isParticipant(user, ticket)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such ticket");
    }
    if (ticket.status === "CLOSED") {
      throw new ApiException(HttpStatus.CONFLICT, "TICKET_CLOSED", "This ticket is closed");
    }
    const now = new Date();
    const isAssignedModerator = ticket.assignedModeratorId === user.id;
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { ticketId, authorId: user.id, content },
        include: WITH_AUTHOR,
      }),
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { lastMessageAt: now, ...(isAssignedModerator && { lastModeratorMessageAt: now }) },
      }),
    ]);
    return toMessagePublic(message);
  }

  private async findTicket(ticketId: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such ticket");
    }
    return ticket;
  }

  /** The requester (SUPPORT), the editor (EDITOR_CHAT) and the assigned moderator. */
  private isParticipant(user: AuthUser, ticket: Ticket): boolean {
    const isRequester =
      ticket.kind === "SUPPORT" ? ticket.openedById === user.id : ticket.editorId === user.id;
    return isRequester || ticket.assignedModeratorId === user.id;
  }
}
