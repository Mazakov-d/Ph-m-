import { z } from "zod";
import { EditorStatus, UserRole } from "../enums.js";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PSEUDO_MAX_LENGTH,
  PSEUDO_MIN_LENGTH,
} from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

// docs/DECISIONS.md: letters (accents included), digits, `_`, `-` and `.`.
export const pseudoSchema = z
  .string()
  .trim()
  .min(PSEUDO_MIN_LENGTH)
  .max(PSEUDO_MAX_LENGTH)
  .regex(/^[\p{L}\p{N}_.-]+$/u);

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

// SPEC §2.1: sign-up with e-mail, password and unique pseudo.
export const registerInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  pseudo: pseudoSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1),
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
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authSessionSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;
