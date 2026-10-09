/** What a person typed to sign in: their e-mail address or their pseudo. */
export type LoginIdentifier = { kind: "email"; email: string } | { kind: "pseudo"; pseudo: string };

/**
 * docs/DECISIONS.md (login): a pseudo never contains « @ » (pseudoSchema), so an identifier with
 * one is an e-mail address (compared in lower case, as stored); any other is a pseudo.
 */
export function parseLoginIdentifier(identifier: string): LoginIdentifier {
  const trimmed = identifier.trim();
  return trimmed.includes("@")
    ? { kind: "email", email: trimmed.toLowerCase() }
    : { kind: "pseudo", pseudo: trimmed };
}
