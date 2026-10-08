import { z } from "zod";
import { UserRole } from "../enums.js";
import { MESSAGE_MAX_LENGTH } from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

// SPEC §8: text only, never edited nor deleted.
export const createMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const messagePublicSchema = z.object({
  id: idSchema,
  ticketId: idSchema,
  authorPseudo: z.string(),
  // True when written by a moderator or an admin, to style « l'équipe » messages.
  fromTeam: z.boolean(),
  // docs/DECISIONS.md (chats): the app signs « Modo », « Admin », or the author's name.
  authorRole: UserRole,
  content: z.string(),
  createdAt: isoDateTimeSchema,
});
export type MessagePublic = z.infer<typeof messagePublicSchema>;

/**
 * docs/DECISIONS.md (real-time conversations): what the app sends on the WebSocket — follow or
 * stop following a conversation. The access token goes in the address (`/ws?token=…`).
 */
export const realtimeClientMessageSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("subscribe"), data: z.object({ ticketId: idSchema }) }),
  z.object({ event: z.literal("unsubscribe"), data: z.object({ ticketId: idSchema }) }),
]);
export type RealtimeClientMessage = z.infer<typeof realtimeClientMessageSchema>;

/** What the API sends: a new message of a followed conversation, or a refusal. */
export const realtimeServerMessageSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("message"), data: messagePublicSchema }),
  z.object({ event: z.literal("subscribed"), data: z.object({ ticketId: idSchema }) }),
  z.object({
    event: z.literal("error"),
    data: z.object({ code: z.enum(["NOT_FOUND", "VALIDATION_ERROR"]) }),
  }),
]);
export type RealtimeServerMessage = z.infer<typeof realtimeServerMessageSchema>;

// docs/DECISIONS.md: the API closes the connection with this code when the access token is
// missing, invalid or expired; the app refreshes its session and reconnects.
export const REALTIME_UNAUTHENTICATED_CLOSE_CODE = 4401;
