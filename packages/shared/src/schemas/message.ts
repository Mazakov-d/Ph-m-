import { z } from "zod";
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
  content: z.string(),
  createdAt: isoDateTimeSchema,
});
export type MessagePublic = z.infer<typeof messagePublicSchema>;
