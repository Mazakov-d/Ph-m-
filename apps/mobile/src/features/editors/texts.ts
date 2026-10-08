import type { EditorApplicantType, EditorProof, EditorStatus } from "@fama/shared";
import { ApiRequestError } from "../../lib/apiClient";

// SPEC §2.2: badge shown on profiles and posts.
export const EDITOR_BADGES: Partial<Record<EditorStatus, string>> = {
  INDEPENDENT: "Indépendant",
  CERTIFIED: "Certifié",
};

export const APPLICATION_STATUS_TEXTS: Record<EditorStatus, string> = {
  PENDING: "Votre demande est en cours d'examen par l'équipe de modération.",
  INDEPENDENT: "Vous êtes éditeur indépendant : vous pouvez publier.",
  CERTIFIED: "Vous êtes éditeur certifié : vous pouvez publier.",
  REJECTED: "Votre demande a été refusée. Vous pouvez en envoyer une nouvelle.",
};

/**
 * docs/DECISIONS.md (editor applications): the four ways to become an editor, as the applicant
 * reads them before choosing.
 */
export const APPLICANT_TYPES: Record<
  EditorApplicantType,
  { label: string; who: string; required: string; optional: string | null }
> = {
  MEDIA_GROUP: {
    label: "Groupe média",
    who: "Entreprise de presse.",
    required:
      "Kbis ou SIRET, mentions légales, directeur de publication, preuve que vous représentez le groupe (e-mail sur le domaine du média et attestation signée).",
    optional: "Agrément CPPAP.",
  },
  JOURNALIST: {
    label: "Journaliste",
    who: "Journaliste professionnel, salarié ou pigiste.",
    required: "Pièce d'identité, au moins 3 travaux publiés et signés.",
    optional: "Carte de presse.",
  },
  INDEPENDENT: {
    label: "Indépendant",
    who: "Personne ou petite structure qui produit de l'information de façon autonome.",
    required: "Pièce d'identité, au moins 3 travaux publiés.",
    optional: "Carte de presse, SIRET.",
  },
  SOCIAL_MEDIA: {
    label: "Média réseaux sociaux",
    who: "Compte d'information né sur un réseau social, sans statut professionnel.",
    required:
      "Pièce d'identité, preuve de propriété du compte (un code à placer dans la bio), liens vers des publications.",
    optional: null,
  },
};

/** What the moderator checks, in French (docs/DECISIONS.md: editor applications). */
export const EDITOR_PROOF_LABELS: Record<EditorProof, string> = {
  IDENTITY: "Pièce d'identité vérifiée",
  SIRET: "SIRET existant (annuaire des entreprises)",
  LEGAL_NOTICE: "Mentions légales du site",
  PUBLICATION_DIRECTOR: "Directeur de publication",
  REPRESENTATION: "Représentation du groupe (e-mail du domaine et attestation signée)",
  PUBLISHED_WORKS: "Au moins 3 travaux publiés et signés",
  ACCOUNT_OWNERSHIP: "Code présent dans la bio du compte",
  PUBLICATION_LINKS: "Publications du compte",
  PRESS_CARD: "Carte de presse",
  CPPAP: "Agrément CPPAP",
};

/** API errors of the editor flow, in French. */
export function editorErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "FILE_TOO_LARGE":
      case "INVALID_DOCUMENT":
        return "Un document est invalide : PDF, JPEG ou PNG de 10 Mo maximum.";
      case "INVALID_STATUS_TRANSITION":
        return "Cette demande a déjà été traitée.";
      case "CONFLICT_OF_INTEREST":
        return "Vous ne pouvez pas traiter cette demande (conflit d'intérêts).";
      case "FORBIDDEN":
        return "Vous n'avez pas le droit d'effectuer cette action.";
      case "EDITOR_APPLICATION_EXISTS":
        return "Vous avez déjà une demande en cours.";
      case "ACCOUNT_RESTRICTED":
        return "Votre compte est suspendu : vous ne pouvez pas faire de demande.";
      case "VALIDATION_ERROR":
        return "Certains champs sont invalides.";
      case "NETWORK_ERROR":
        return "Impossible de joindre le serveur. Vérifiez votre connexion.";
      default:
        break;
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
