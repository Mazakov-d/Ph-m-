// Permission matrix of SPEC §2.5. The backend uses can() to authorize, the app to hide buttons.
// Only the backend is authoritative.
import type { EditorStatus, UserRole } from "./enums.js";

export const PERMISSIONS = [
  "post.read",
  "comment.create",
  "vote.cast",
  "report.create",
  "support.open",
  "user.block",
  "editor.apply",
  "post.create",
  "post.toggleComments",
  "moderation.queue.read",
  "moderation.decide",
  "ticket.assign",
  "chat.readAll",
  "editor.validateIndependent",
  "editor.validateCertified",
  "moderator.manage",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_MATRIX: Record<UserRole, readonly Permission[]> = {
  // docs/DECISIONS.md: only a reader can apply for the editor status.
  READER: [
    "post.read",
    "comment.create",
    "vote.cast",
    "report.create",
    "support.open",
    "user.block",
    "editor.apply",
  ],
  EDITOR: [
    "post.read",
    "comment.create",
    "vote.cast",
    "report.create",
    "support.open",
    "user.block",
    "post.create",
    "post.toggleComments",
  ],
  MODERATOR: [
    "post.read",
    "comment.create",
    "vote.cast",
    "report.create",
    "user.block",
    "moderation.queue.read",
    "moderation.decide",
    "ticket.assign",
    "editor.validateIndependent",
  ],
  ADMIN: [
    "post.read",
    "comment.create",
    "vote.cast",
    "report.create",
    "user.block",
    "moderation.queue.read",
    "moderation.decide",
    "ticket.assign",
    "chat.readAll",
    "editor.validateIndependent",
    "editor.validateCertified",
    "moderator.manage",
    "audit.read",
  ],
};

// SPEC §2.2: only validated editors may publish.
const PUBLISHING_EDITOR_STATUSES: readonly EditorStatus[] = ["INDEPENDENT", "CERTIFIED"];

// docs/DECISIONS.md: a suspended or banned account keeps only reading and contacting the team.
const PERMISSIONS_KEPT_WHEN_RESTRICTED: readonly Permission[] = ["post.read", "support.open"];

// SPEC §2: an anonymous visitor can read the feed and the posts.
const ANONYMOUS_PERMISSIONS: readonly Permission[] = ["post.read"];

/** What can() needs to know about a signed-in account. Dates are ISO 8601 strings. */
export type PermissionSubject = {
  role: UserRole;
  editorStatus: EditorStatus | null;
  suspendedUntil: string | null;
  bannedAt: string | null;
};

/** True if the account is banned, or suspended with an end date still in the future. */
export function isRestricted(user: PermissionSubject, now: Date): boolean {
  if (user.bannedAt !== null) {
    return true;
  }
  return user.suspendedUntil !== null && new Date(user.suspendedUntil) > now;
}

/** `user` is null for an anonymous visitor. */
export function can(
  user: PermissionSubject | null,
  permission: Permission,
  now: Date = new Date(),
): boolean {
  if (user === null) {
    return ANONYMOUS_PERMISSIONS.includes(permission);
  }
  if (!PERMISSION_MATRIX[user.role].includes(permission)) {
    return false;
  }
  if (isRestricted(user, now) && !PERMISSIONS_KEPT_WHEN_RESTRICTED.includes(permission)) {
    return false;
  }
  if (permission === "post.create") {
    return user.editorStatus !== null && PUBLISHING_EDITOR_STATUSES.includes(user.editorStatus);
  }
  return true;
}
