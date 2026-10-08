import {
  checkEditorApplication,
  EditorApplicantType,
  editorApplicationFieldsSchema,
} from "@fama/shared";
import { z } from "zod";

// In the form, every optional text is a text field (empty when not given).
const text = z.string();

/**
 * The application form: text fields, turned into the API's input (empty → null, blank links
 * dropped), then checked by the same rules as the API (shared/schemas/editor.ts).
 */
export const editorApplicationFormSchema = z
  .object({
    // Optional here so that every missing field shows at once; the shared schema requires it.
    applicantType: EditorApplicantType.optional(),
    legalFirstName: text,
    legalLastName: text,
    editorialLine: text,
    ownerName: text,
    ownerGroup: text,
    showIdentityPublicly: z.boolean(),
    siret: text,
    websiteUrl: text,
    publicationDirector: text,
    professionalEmail: text,
    cppapNumber: text,
    workLinks: z.array(text),
    pressCardNumber: text,
    socialAccountUrl: text,
  })
  .transform((form, context) => {
    const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
    const input = {
      ...form,
      ownerGroup: orNull(form.ownerGroup),
      siret: orNull(form.siret),
      websiteUrl: orNull(form.websiteUrl),
      publicationDirector: orNull(form.publicationDirector),
      professionalEmail: orNull(form.professionalEmail),
      cppapNumber: orNull(form.cppapNumber),
      workLinks: form.workLinks.map((link) => link.trim()).filter((link) => link !== ""),
      pressCardNumber: orNull(form.pressCardNumber),
      socialAccountUrl: orNull(form.socialAccountUrl),
    };
    // The same field rules and proofs as the API, reported on the form's fields.
    const parsed = editorApplicationFieldsSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    checkEditorApplication(parsed.data, context);
    return parsed.data;
  });

export type EditorApplicationFormValues = z.input<typeof editorApplicationFormSchema>;
