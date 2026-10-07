import { z } from "zod";
import { TicketKind, TicketStatus } from "../enums.js";
import { cursorQuerySchema, idSchema, isoDateTimeSchema } from "./common.js";
import { createMessageInputSchema } from "./message.js";

// SPEC §8: any account opens a SUPPORT ticket; a moderator opens an EDITOR_CHAT with an editor.
// A ticket starts with its first message.
export const createTicketInputSchema = z.discriminatedUnion("kind", [
  createMessageInputSchema.extend({ kind: z.literal("SUPPORT") }),
  createMessageInputSchema.extend({ kind: z.literal("EDITOR_CHAT"), editorId: idSchema }),
]);
export type CreateTicketInput = z.infer<typeof createTicketInputSchema>;

export const ticketQuerySchema = cursorQuerySchema.extend({
  status: TicketStatus.optional(),
});
export type TicketQuery = z.infer<typeof ticketQuerySchema>;

/** A ticket as seen by the account that opened it (or the editor of an EDITOR_CHAT). */
export const ticketPublicSchema = z.object({
  id: idSchema,
  kind: TicketKind,
  status: TicketStatus,
  createdAt: isoDateTimeSchema,
  lastMessageAt: isoDateTimeSchema,
});
export type TicketPublic = z.infer<typeof ticketPublicSchema>;

/** A ticket as seen by moderators and admins. */
export const ticketModerationSchema = ticketPublicSchema.extend({
  openedById: idSchema,
  openedByPseudo: z.string(),
  assignedModeratorId: idSchema.nullable(),
  assignedAt: isoDateTimeSchema.nullable(),
});
export type TicketModeration = z.infer<typeof ticketModerationSchema>;
