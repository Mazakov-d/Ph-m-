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

// docs/DECISIONS.md: moderators list the unassigned tickets or their own.
export const ticketQuerySchema = cursorQuerySchema.extend({
  scope: z.enum(["unassigned", "mine"]).default("unassigned"),
});
export type TicketQuery = z.infer<typeof ticketQuerySchema>;

/** SPEC §8: a moderator opens a chat with an editor (about a report, for example). */
export const createEditorChatInputSchema = createMessageInputSchema.extend({
  editorId: idSchema,
});
export type CreateEditorChatInput = z.infer<typeof createEditorChatInputSchema>;

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
  // docs/DECISIONS.md (chats): an EDITOR_CHAT opens on the page of its editor.
  editorId: idSchema.nullable(),
  editorPseudo: z.string().nullable(),
  assignedModeratorId: idSchema.nullable(),
  assignedModeratorPseudo: z.string().nullable(),
  assignedAt: isoDateTimeSchema.nullable(),
  // The first message, so that moderators know what a NEW ticket is about.
  firstMessage: z.string(),
  // docs/DECISIONS.md (chats): the last message is not the team's — someone is waiting.
  awaitingTeam: z.boolean(),
});
export type TicketModeration = z.infer<typeof ticketModerationSchema>;

/** docs/DECISIONS.md (chats): the open chat with an editor that the viewer may see, if any. */
export const editorChatModerationSchema = z.object({ ticket: ticketModerationSchema.nullable() });
export type EditorChatModeration = z.infer<typeof editorChatModerationSchema>;
