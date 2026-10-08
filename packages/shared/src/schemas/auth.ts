import { z } from "zod";
import { EditorStatus, UserRole } from "../enums.js";
import {
  DELETED_ACCOUNT_PSEUDO,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PSEUDO_MAX_LENGTH,
  PSEUDO_MIN_LENGTH,
} from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

// docs/DECISIONS.md: words of letters (accents included), digits, `_`, `-` and `.`,
// separated by single spaces (« Le Monde »).
export const pseudoSchema = z
  .string()
  .trim()
  .min(PSEUDO_MIN_LENGTH)
  .max(PSEUDO_MAX_LENGTH)
  .regex(/^[\p{L}\p{N}_.-]+( [\p{L}\p{N}_.-]+)*$/u);

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

// SPEC §2.1: sign-up with e-mail, password and unique pseudo.
export const registerInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  // docs/DECISIONS.md: the name of deleted accounts is reserved.
  pseudo: pseudoSchema.refine(
    (pseudo) => pseudo.toLocaleLowerCase("fr") !== DELETED_ACCOUNT_PSEUDO.toLocaleLowerCase("fr"),
    { message: "This pseudo is reserved", params: { reason: "reserved" } },
  ),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// docs/DECISIONS.md: the web client keeps its refresh token in an httpOnly cookie that
// JavaScript cannot read, so it tells the API which kind of client it is with this header.
export const CLIENT_KIND_HEADER = "x-fama-client";
export const ClientKind = z.enum(["web", "native"]);
export type ClientKind = z.infer<typeof ClientKind>;

// Native clients send their refresh token in the body; the web client sends it as a cookie.
export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

/** The signed-in account, as seen by itself. Satisfies PermissionSubject for can(). */
export const authUserSchema = z.object({
  id: idSchema,
  email: z.email(),
  pseudo: z.string(),
  role: UserRole,
  editorStatus: EditorStatus.nullable(),
  suspendedUntil: isoDateTimeSchema.nullable(),
  bannedAt: isoDateTimeSchema.nullable(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  // Null for the web client, which receives it as an httpOnly cookie instead.
  refreshToken: z.string().nullable(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authSessionSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

/** SPEC §10: deleting one's account from the app, confirmed with the password. */
export const deleteAccountInputSchema = z.object({
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;

// docs/DECISIONS.md (moderators): an ADMIN creates a moderator account (pseudo, e-mail, password).
export const createModeratorInputSchema = registerInputSchema;
export type CreateModeratorInput = z.infer<typeof createModeratorInputSchema>;

/** A moderator account as the ADMIN lists them. */
export const moderatorModerationSchema = z.object({
  id: z.uuid(),
  pseudo: z.string(),
  email: z.string(),
  createdAt: z.iso.datetime(),
});
export type ModeratorModeration = z.infer<typeof moderatorModerationSchema>;
