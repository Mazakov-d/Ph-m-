import { z } from "zod";
import { SanctionType } from "../enums.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

/** SPEC §6.3: a sanction, shown to the sanctioned user on « Mes sanctions ». */
export const sanctionPublicSchema = z.object({
  id: idSchema,
  type: SanctionType,
  // The removed comment that caused the sanction.
  commentId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  // End of a suspension; null for a warning or a permanent ban.
  endsAt: isoDateTimeSchema.nullable(),
  // SPEC §6.3: a sanction can be appealed once.
  canAppeal: z.boolean(),
});
export type SanctionPublic = z.infer<typeof sanctionPublicSchema>;
