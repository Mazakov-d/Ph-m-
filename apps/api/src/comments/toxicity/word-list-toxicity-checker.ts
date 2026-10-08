import { FORBIDDEN_TERMS } from "./forbidden-terms.js";
import { containsPhrase, normalizeWords } from "./normalize.js";
import { ToxicityChecker, type ToxicityVerdict } from "./toxicity-checker.js";

/** SPEC §6.2: MVP filter, a list of forbidden terms compared after normalization. */
export class WordListToxicityChecker extends ToxicityChecker {
  private readonly phrases: { term: string; words: string[] }[];

  constructor(terms: readonly string[] = FORBIDDEN_TERMS) {
    super();
    // Listed terms go through the same normalization as the comments they are compared to.
    // Longest phrases first, so the most specific term is reported (« fils de pute », not « pute »).
    this.phrases = terms
      .map((term) => ({ term, words: normalizeWords(term) }))
      .sort((a, b) => b.words.length - a.words.length);
  }

  check(text: string): Promise<ToxicityVerdict> {
    const words = normalizeWords(text);
    const match = this.phrases.find((phrase) => containsPhrase(words, phrase.words));
    return Promise.resolve(match ? { blocked: true, matchedTerm: match.term } : { blocked: false });
  }
}
