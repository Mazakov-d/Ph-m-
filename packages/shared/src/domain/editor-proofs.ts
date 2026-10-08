import type { EditorApplicantType, EditorProof } from "../enums.js";

/**
 * docs/DECISIONS.md (editor applications): the proofs each kind of applicant gives — the
 * required ones are checked by a moderator before any validation, the optional ones only add
 * trust (and may support a certification).
 */
export const EDITOR_PROOFS: Record<
  EditorApplicantType,
  { required: EditorProof[]; optional: EditorProof[] }
> = {
  MEDIA_GROUP: {
    required: ["IDENTITY", "SIRET", "LEGAL_NOTICE", "PUBLICATION_DIRECTOR", "REPRESENTATION"],
    optional: ["CPPAP"],
  },
  JOURNALIST: { required: ["IDENTITY", "PUBLISHED_WORKS"], optional: ["PRESS_CARD"] },
  INDEPENDENT: { required: ["IDENTITY", "PUBLISHED_WORKS"], optional: ["PRESS_CARD", "SIRET"] },
  SOCIAL_MEDIA: {
    required: ["IDENTITY", "ACCOUNT_OWNERSHIP", "PUBLICATION_LINKS"],
    optional: [],
  },
};

/** The required proofs of an application that the moderator has not checked yet. */
export function missingRequiredProofs(
  type: EditorApplicantType,
  checked: EditorProof[],
): EditorProof[] {
  return EDITOR_PROOFS[type].required.filter((proof) => !checked.includes(proof));
}

const SIRET_LENGTH = 14;

/**
 * A SIRET is 14 digits whose Luhn checksum is valid (INSEE). It catches typing mistakes; the
 * moderator still checks the company in the public register.
 */
export function isValidSiret(siret: string): boolean {
  if (!new RegExp(`^\\d{${SIRET_LENGTH}}$`).test(siret)) return false;
  let sum = 0;
  for (let index = 0; index < SIRET_LENGTH; index++) {
    let digit = Number(siret.charAt(SIRET_LENGTH - 1 - index));
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return match?.[1]?.toLowerCase().replace(/^www\./, "") ?? null;
}

/**
 * docs/DECISIONS.md: the professional e-mail of a media group's representative is on the
 * domain of the media's website (« prenom@lemonde.fr » for « https://www.lemonde.fr »).
 */
export function isEmailOnWebsiteDomain(email: string, websiteUrl: string): boolean {
  const host = hostOf(websiteUrl);
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (!host || !emailDomain) return false;
  return (
    emailDomain === host || emailDomain.endsWith(`.${host}`) || host.endsWith(`.${emailDomain}`)
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/**
 * docs/DECISIONS.md: the code a social media account places in its bio to prove it belongs to
 * the applicant (« PHEME-7KQ2X9 »); letters and digits that cannot be confused.
 */
export function newVerificationCode(random: () => number): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index++) {
    code += CODE_ALPHABET.charAt(Math.floor(random() * CODE_ALPHABET.length));
  }
  return `PHEME-${code}`;
}
