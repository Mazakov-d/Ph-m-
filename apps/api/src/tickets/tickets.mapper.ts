import type { MessagePublic, TicketModeration, TicketPublic } from "@fama/shared";
import type { Message, Ticket, User } from "../generated/prisma/client.js";

export type TicketRecord = Ticket & {
  openedBy: Pick<User, "pseudo">;
  editor: Pick<User, "pseudo"> | null;
  assignedModerator: Pick<User, "pseudo"> | null;
  messages: Pick<Message, "content">[];
};

export const TICKET_INCLUDE = {
  openedBy: { select: { pseudo: true } },
  editor: { select: { pseudo: true } },
  assignedModerator: { select: { pseudo: true } },
  // The first message (what the ticket is about).
  messages: { orderBy: { createdAt: "asc" }, take: 1, select: { content: true } },
} as const;

export function toTicketPublic(ticket: Ticket): TicketPublic {
  return {
    id: ticket.id,
    kind: ticket.kind,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
  };
}

export function toTicketModeration(ticket: TicketRecord): TicketModeration {
  return {
    ...toTicketPublic(ticket),
    openedById: ticket.openedById,
    openedByPseudo: ticket.openedBy.pseudo,
    editorPseudo: ticket.editor?.pseudo ?? null,
    assignedModeratorId: ticket.assignedModeratorId,
    assignedModeratorPseudo: ticket.assignedModerator?.pseudo ?? null,
    assignedAt: ticket.assignedAt?.toISOString() ?? null,
    firstMessage: ticket.messages[0]?.content ?? "",
  };
}

const TEAM_ROLES = ["MODERATOR", "ADMIN"];

export function toMessagePublic(
  message: Message & { author: Pick<User, "pseudo" | "role"> },
): MessagePublic {
  return {
    id: message.id,
    ticketId: message.ticketId,
    authorPseudo: message.author.pseudo,
    fromTeam: TEAM_ROLES.includes(message.author.role),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
