import type {
  EditorApplicationPublic,
  EditorModeration,
  EditorPublic,
  EditorReliabilityLevel,
} from "@fama/shared";
import type { EditorIdentity, EditorProfile, User } from "../generated/prisma/client.js";

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

export type EditorApplicationRecord = EditorProfile & {
  user: Pick<User, "pseudo"> & { editorIdentity: EditorIdentity | null };
};

/** Application as seen by moderators (SPEC §2.2, restricted access). */
export function toEditorModeration(record: EditorApplicationRecord): EditorModeration {
  const identity = record.user.editorIdentity;
  if (!identity) {
    throw new Error(`Editor application ${record.userId} has no legal identity`);
  }
  return {
    userId: record.userId,
    pseudo: record.user.pseudo,
    editorStatus: record.status,
    legalFirstName: identity.legalFirstName,
    legalLastName: identity.legalLastName,
    editorialLine: record.editorialLine,
    ownerName: record.ownerName,
    ownerGroup: record.ownerGroup,
    showIdentityPublicly: record.showIdentityPublicly,
    documentCount: identity.documentKeys.length,
    rejectionReason: record.rejectionReason,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * SPEC §2.2: public profile. When the editor hides their identity, the key is left out
 * entirely, so the JSON never contains any identity field.
 */
export function toEditorPublic(
  record: EditorApplicationRecord,
  reliability: EditorReliabilityLevel,
): EditorPublic {
  const profile: EditorPublic = {
    id: record.userId,
    pseudo: record.user.pseudo,
    editorStatus: record.status,
    editorialLine: record.editorialLine,
    ownerName: record.ownerName,
    ownerGroup: record.ownerGroup,
    reliability,
  };
  const identity = record.user.editorIdentity;
  if (record.showIdentityPublicly && identity) {
    profile.legalIdentity = {
      firstName: identity.legalFirstName,
      lastName: identity.legalLastName,
    };
  }
  return profile;
}
