import { z } from "zod";
import { EditorReliabilityLevel, EditorStatus } from "../enums.js";
import {
  DONATION_URL_MAX_LENGTH,
  EDITORIAL_LINE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
} from "../rules.js";
import { cursorQuerySchema, idSchema, isoDateTimeSchema } from "./common.js";

const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);

/**
 * SPEC §2.2: request for the editor status. The legal identity is always collected;
 * identity documents are uploaded separately to private storage.
 */
export const createEditorApplicationInputSchema = z.object({
  legalFirstName: nameSchema,
  legalLastName: nameSchema,
  editorialLine: z.string().trim().min(1).max(EDITORIAL_LINE_MAX_LENGTH),
  ownerName: nameSchema,
  ownerGroup: nameSchema.nullable(),
  showIdentityPublicly: z.boolean().default(false),
});
export type CreateEditorApplicationInput = z.infer<typeof createEditorApplicationInputSchema>;

/** The applicant's own view of their application (« Devenir éditeur » screen). */
export const editorApplicationPublicSchema = z.object({
  status: EditorStatus,
  rejectionReason: z.string().nullable(),
  editorialLine: z.string(),
  ownerName: z.string(),
  ownerGroup: z.string().nullable(),
  showIdentityPublicly: z.boolean(),
  documentCount: z.number().int().nonnegative(),
  // docs/DECISIONS.md (donations): null until the editor gives one.
  donationUrl: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type EditorApplicationPublic = z.infer<typeof editorApplicationPublicSchema>;

export const editorApplicationQuerySchema = cursorQuerySchema.extend({
  status: EditorStatus.default("PENDING"),
});
export type EditorApplicationQuery = z.infer<typeof editorApplicationQuerySchema>;

export const updateEditorProfileInputSchema = z.object({
  showIdentityPublicly: z.boolean(),
});
export type UpdateEditorProfileInput = z.infer<typeof updateEditorProfileInputSchema>;

/**
 * docs/DECISIONS.md (donations): a secure (https) link to the editor's own donation page;
 * Phémé handles no payment and takes no commission. null removes it.
 */
export const updateDonationLinkInputSchema = z.object({
  donationUrl: z
    .url({ protocol: /^https$/ })
    .max(DONATION_URL_MAX_LENGTH)
    .nullable(),
});
export type UpdateDonationLinkInput = z.infer<typeof updateDonationLinkInputSchema>;

// SPEC §2.2: INDEPENDENT by a moderator or admin, CERTIFIED by an admin only (checked by the API),
// REJECTED with a mandatory reason.
export const editorDecisionInputSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("INDEPENDENT") }),
  z.object({ status: z.literal("CERTIFIED") }),
  z.object({
    status: z.literal("REJECTED"),
    rejectionReason: z.string().trim().min(1).max(REJECTION_REASON_MAX_LENGTH),
  }),
]);
export type EditorDecisionInput = z.infer<typeof editorDecisionInputSchema>;

/** Editor shown on a post card: pseudo and badge. */
export const editorSummaryPublicSchema = z.object({
  id: idSchema,
  pseudo: z.string(),
  editorStatus: EditorStatus,
});
export type EditorSummaryPublic = z.infer<typeof editorSummaryPublicSchema>;

/**
 * SPEC §2.2: public profile. `legalIdentity` is absent (not null) when the editor hides it,
 * so the JSON never contains an identity field.
 */
export const editorPublicSchema = editorSummaryPublicSchema.extend({
  editorialLine: z.string(),
  ownerName: z.string(),
  ownerGroup: z.string().nullable(),
  legalIdentity: z.object({ firstName: z.string(), lastName: z.string() }).optional(),
  // SPEC §5.7: the tier of the reliability gauge, never the score.
  reliability: EditorReliabilityLevel,
  // docs/DECISIONS.md (donations): « Soutenir » opens it (null: no button).
  donationUrl: z.string().nullable(),
});
export type EditorPublic = z.infer<typeof editorPublicSchema>;

/** Editor application as seen by moderators (SPEC §2.2, restricted access). */
export const editorModerationSchema = z.object({
  userId: idSchema,
  pseudo: z.string(),
  editorStatus: EditorStatus,
  legalFirstName: z.string(),
  legalLastName: z.string(),
  editorialLine: z.string(),
  ownerName: z.string(),
  ownerGroup: z.string().nullable(),
  showIdentityPublicly: z.boolean(),
  documentCount: z.number().int().nonnegative(),
  rejectionReason: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type EditorModeration = z.infer<typeof editorModerationSchema>;
