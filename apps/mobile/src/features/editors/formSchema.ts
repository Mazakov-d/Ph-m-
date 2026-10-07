import { createEditorApplicationInputSchema, NAME_MAX_LENGTH } from "@fama/shared";
import { z } from "zod";

/**
 * The application form: same rules as the shared schema, except that the optional owner group
 * is an empty text field in the form and null in the API.
 */
export const editorApplicationFormSchema = createEditorApplicationInputSchema
  .omit({ ownerGroup: true })
  .extend({ ownerGroup: z.string().trim().max(NAME_MAX_LENGTH) })
  .transform(({ ownerGroup, ...rest }) => ({ ...rest, ownerGroup: ownerGroup || null }));
