export type ToxicityVerdict = { blocked: false } | { blocked: true; matchedTerm: string };

/**
 * SPEC §6.2 step 1: automatic filter run before a comment is saved. An abstract class so that
 * it serves as the injection token, and the MVP word list can later be replaced by a service.
 */
export abstract class ToxicityChecker {
  abstract check(text: string): Promise<ToxicityVerdict>;
}
