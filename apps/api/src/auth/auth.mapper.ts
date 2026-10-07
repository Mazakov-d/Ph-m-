import type { AuthUser } from "@fama/shared";
import type { EditorProfile, User } from "../generated/prisma/client.js";

export type UserWithEditorProfile = User & { editorProfile: Pick<EditorProfile, "status"> | null };

/** The signed-in account as seen by itself (never contains the password hash). */
export function toAuthUser(user: UserWithEditorProfile): AuthUser {
  return {
    id: user.id,
    email: user.email,
    pseudo: user.pseudo,
    role: user.role,
    editorStatus: user.editorProfile?.status ?? null,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    bannedAt: user.bannedAt?.toISOString() ?? null,
  };
}
