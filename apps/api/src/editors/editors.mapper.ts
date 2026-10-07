import type { EditorApplicationPublic } from "@fama/shared";
import type { EditorIdentity, EditorProfile } from "../generated/prisma/client.js";

/** The applicant's own view of their application (never the legal identity or documents). */
export function toEditorApplicationPublic(
  profile: EditorProfile,
  identity: Pick<EditorIdentity, "documentKeys">,
): EditorApplicationPublic {
  return {
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    editorialLine: profile.editorialLine,
    ownerName: profile.ownerName,
    ownerGroup: profile.ownerGroup,
    showIdentityPublicly: profile.showIdentityPublicly,
    documentCount: identity.documentKeys.length,
    createdAt: profile.createdAt.toISOString(),
  };
}
