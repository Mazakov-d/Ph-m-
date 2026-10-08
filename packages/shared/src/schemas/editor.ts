import { z } from "zod";
import { isEmailOnWebsiteDomain, isValidSiret } from "../domain/editor-proofs.js";
import {
  EditorApplicantType,
  EditorProof,
  EditorReliabilityLevel,
  EditorStatus,
} from "../enums.js";
import {
  DONATION_URL_MAX_LENGTH,
  EDITORIAL_LINE_MAX_LENGTH,
  EDITOR_WORK_LINKS_MAX,
  EDITOR_WORK_LINKS_MIN,
  NAME_MAX_LENGTH,
  REJECTION_REASON_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
} from "../rules.js";
import { cursorQuerySchema, idSchema, isoDateTimeSchema } from "./common.js";

const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);

const linkSchema = z.url({ protocol: /^https?$/ }).max(SOURCE_MAX_LENGTH);

/**
 * SPEC §2.2: request for the editor status. The legal identity is always collected; identity
 * documents (and, for a media group, its Kbis and signed attestation) are uploaded separately to
 * private storage. docs/DECISIONS.md (editor applications): each kind of applicant gives its own
 * proofs — see domain/editor-proofs.ts.
 */
export const editorApplicationFieldsSchema = z.object({
  applicantType: EditorApplicantType,
  legalFirstName: nameSchema,
  legalLastName: nameSchema,
  editorialLine: z.string().trim().min(1).max(EDITORIAL_LINE_MAX_LENGTH),
  ownerName: nameSchema,
  ownerGroup: nameSchema.nullable(),
  showIdentityPublicly: z.boolean().default(false),
  // Media group (SIRET also optional for an independent editor).
  siret: z.string().trim().nullable().default(null),
  websiteUrl: linkSchema.nullable().default(null),
  publicationDirector: nameSchema.nullable().default(null),
  professionalEmail: z.email().nullable().default(null),
  cppapNumber: z.string().trim().min(1).max(NAME_MAX_LENGTH).nullable().default(null),
  // Journalist, independent editor, social media account: published works / publications.
  workLinks: z.array(linkSchema).max(EDITOR_WORK_LINKS_MAX).default([]),
  pressCardNumber: z.string().trim().min(1).max(NAME_MAX_LENGTH).nullable().default(null),
  // Social media account.
  socialAccountUrl: linkSchema.nullable().default(null),
});
type EditorApplicationFields = z.infer<typeof editorApplicationFieldsSchema>;

/** The proofs each kind of applicant must give (shared with the app's form). */
export function checkEditorApplication(
  application: EditorApplicationFields,
  context: z.RefinementCtx,
): void {
  const missing = (path: string, message: string) =>
    context.addIssue({ code: "custom", path: [path], message });
  if (application.siret !== null && !isValidSiret(application.siret)) {
    missing("siret", "Invalid SIRET");
  }
  const needsWorks =
    application.applicantType === "JOURNALIST" ||
    application.applicantType === "INDEPENDENT" ||
    application.applicantType === "SOCIAL_MEDIA";
  if (needsWorks && new Set(application.workLinks).size < EDITOR_WORK_LINKS_MIN) {
    missing("workLinks", `At least ${EDITOR_WORK_LINKS_MIN} distinct published works`);
  }
  if (application.applicantType === "MEDIA_GROUP") {
    if (application.siret === null) missing("siret", "A media group gives its SIRET");
    if (application.websiteUrl === null) missing("websiteUrl", "The website of the media");
    if (application.publicationDirector === null) {
      missing("publicationDirector", "The publication director");
    }
    if (application.professionalEmail === null) {
      missing("professionalEmail", "An e-mail on the media's domain");
    } else if (
      application.websiteUrl !== null &&
      !isEmailOnWebsiteDomain(application.professionalEmail, application.websiteUrl)
    ) {
      missing("professionalEmail", "The e-mail is not on the media's domain");
    }
  }
  if (application.applicantType === "SOCIAL_MEDIA" && application.socialAccountUrl === null) {
    missing("socialAccountUrl", "The link to the account");
  }
}

export const createEditorApplicationInputSchema =
  editorApplicationFieldsSchema.superRefine(checkEditorApplication);
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
  applicantType: EditorApplicantType,
  // docs/DECISIONS.md: the code a social media account places in its bio.
  verificationCode: z.string(),
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
// docs/DECISIONS.md (editor applications): a validation lists the proofs the moderator checked;
// every required proof of the applicant's kind must be there (checked by the API).
export const editorDecisionInputSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("INDEPENDENT"), checkedProofs: z.array(EditorProof) }),
  z.object({ status: z.literal("CERTIFIED"), checkedProofs: z.array(EditorProof) }),
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
  // docs/DECISIONS.md (editor applications): the kind of applicant and its proofs.
  applicantType: EditorApplicantType,
  siret: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  publicationDirector: z.string().nullable(),
  professionalEmail: z.string().nullable(),
  cppapNumber: z.string().nullable(),
  workLinks: z.array(z.string()),
  pressCardNumber: z.string().nullable(),
  socialAccountUrl: z.string().nullable(),
  verificationCode: z.string(),
  verifiedProofs: z.array(EditorProof),
  documentCount: z.number().int().nonnegative(),
  rejectionReason: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type EditorModeration = z.infer<typeof editorModerationSchema>;
