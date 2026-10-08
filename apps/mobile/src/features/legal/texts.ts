/**
 * SPEC §10 + ROADMAP phase 11: the community rules, the privacy policy and the legal notice.
 *
 * ⚠ PLACEHOLDERS: the final texts are provided by the project owner (ideally reviewed by a
 * lawyer). Each page lists what it must contain, from the SPEC; replace the whole page text.
 */
export type LegalPage = "rules" | "privacy" | "legal-notice";

export const LEGAL_PAGES: Record<LegalPage, { title: string; draft: boolean; sections: string[] }> =
  {
    rules: {
      title: "Règles de la communauté",
      draft: true,
      sections: [
        "Texte à fournir par le porteur du projet.",
        "Points à couvrir (SPEC §6) : commentaires réservés aux comptes connectés, jamais modifiables ; filtre automatique des termes interdits ; signalements pondérés ; examen par la modération (conforme ou retiré) ; sanctions sur 6 mois : avertissement, suspension de 24 h, suspension de 7 jours, bannissement ; bannissement immédiat en cas de discrimination ; contestation possible une fois ; signalement éventuel sur PHAROS.",
        "Publications (SPEC §3 et §5) : informations sourcées, revue des articles signalés, verdict public et droit de réponse de l'éditeur sous 48 h, appel unique.",
      ],
    },
    privacy: {
      title: "Politique de confidentialité",
      draft: true,
      sections: [
        "Texte à fournir par le porteur du projet.",
        "Mentions obligatoires (SPEC §10) : les conversations avec l'équipe (support et échanges éditeurs) sont conservées et peuvent être lues par la direction ; chaque lecture par la direction est enregistrée.",
        "À préciser : données collectées (e-mail, pseudo, identité légale et documents des éditeurs, signalements, votes), durée de conservation (RETENTION_DAYS, à confirmer avec un juriste), suppression du compte depuis l'application, droits RGPD et contact.",
      ],
    },
    "legal-notice": {
      title: "Mentions légales",
      draft: true,
      sections: [
        "Texte à fournir par le porteur du projet.",
        "À préciser : éditeur du service, directeur de la publication, hébergeur, contact.",
      ],
    },
  };

export const DRAFT_NOTICE = "Brouillon — texte définitif à fournir par le porteur du projet.";
