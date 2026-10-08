// SPEC §6.2: "normalisation des contournements simples".

// Digits and symbols commonly used in place of letters (l33t).
const SUBSTITUTIONS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "€": "e",
};

const MIN_LENGTH_FOR_PLURAL = 4;

/** « connnnard » → « conard »: written and listed forms are compared with runs collapsed. */
function collapseRepeatedLetters(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

/** « connards », « bâtards », « travaux » → singular-like form, to match the listed word. */
function dropPluralMark(word: string): string {
  return word.length >= MIN_LENGTH_FOR_PLURAL ? word.replace(/[sx]$/, "") : word;
}

/**
 * Turns a text into comparable words: lower case, no accents, l33t substitutions undone,
 * letters written one by one (« c o n n a r d », « c.o.n.n.a.r.d ») joined back together,
 * repeated letters collapsed, plural marks dropped.
 */
export function normalizeWords(text: string): string[] {
  const withoutAccents = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const substituted = [...withoutAccents].map((char) => SUBSTITUTIONS[char] ?? char).join("");
  const rawWords = substituted.split(/[^a-z]+/).filter((word) => word.length > 0);

  const words: string[] = [];
  let lettersRun = "";
  for (const word of rawWords) {
    if (word.length === 1) {
      lettersRun += word;
      continue;
    }
    if (lettersRun) {
      words.push(lettersRun);
      lettersRun = "";
    }
    words.push(word);
  }
  if (lettersRun) {
    words.push(lettersRun);
  }
  return words.map((word) => dropPluralMark(collapseRepeatedLetters(word)));
}

/** True if `phrase` (already normalized) appears as consecutive words of `words`. */
export function containsPhrase(words: string[], phrase: string[]): boolean {
  if (phrase.length === 0) {
    return false;
  }
  for (let start = 0; start + phrase.length <= words.length; start++) {
    if (phrase.every((word, offset) => words[start + offset] === word)) {
      return true;
    }
  }
  return false;
}
