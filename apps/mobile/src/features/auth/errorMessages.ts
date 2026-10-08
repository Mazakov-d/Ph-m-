import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PSEUDO_MAX_LENGTH,
  PSEUDO_MIN_LENGTH,
} from "@fama/shared";
import type { FieldError } from "react-hook-form";
import { ApiRequestError } from "../../lib/apiClient";

// French messages of the sign-up and sign-in forms, by field and Zod error type.
const FIELD_MESSAGES = {
  email: { default: "Adresse e-mail invalide." },
  password: {
    too_small: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
    too_big: `${PASSWORD_MAX_LENGTH} caractères maximum.`,
    default: "Mot de passe requis.",
  },
  pseudo: {
    // docs/DECISIONS.md: « Compte supprimé » is reserved.
    custom: "Ce pseudo est réservé.",
    too_small: `Au moins ${PSEUDO_MIN_LENGTH} caractères.`,
    too_big: `${PSEUDO_MAX_LENGTH} caractères maximum.`,
    default: "Lettres, chiffres, « _ », « - », « . » et espaces simples uniquement.",
  },
} as const;

type AuthField = keyof typeof FIELD_MESSAGES;

export function fieldErrorMessage(field: AuthField, error: FieldError | undefined) {
  if (!error) {
    return undefined;
  }
  // Errors set from an API answer already carry their French message.
  if (error.type === "server") {
    return error.message;
  }
  const messages: Record<string, string> = FIELD_MESSAGES[field];
  return messages[error.type] ?? messages.default;
}

/** An API error explained in French, attached to a field when it concerns one. */
export function apiErrorMessage(error: unknown): { field?: AuthField; message: string } {
  if (!(error instanceof ApiRequestError)) {
    return { message: "Une erreur est survenue. Réessayez." };
  }
  switch (error.code) {
    case "EMAIL_TAKEN":
      return { field: "email", message: "Un compte existe déjà avec cette adresse." };
    case "PSEUDO_TAKEN":
      return { field: "pseudo", message: "Ce pseudo est déjà pris." };
    case "INVALID_CREDENTIALS":
      return { message: "E-mail ou mot de passe incorrect." };
    case "RATE_LIMITED":
      return { message: "Trop de tentatives. Patientez quelques minutes avant de réessayer." };
    case "NETWORK_ERROR":
      return { message: "Impossible de joindre le serveur. Vérifiez votre connexion." };
    default:
      return { message: "Une erreur est survenue. Réessayez." };
  }
}
