/**
 * docs/DECISIONS.md (interface brief): an editor may put words in bold, italic or both. The text
 * is stored with markers, as in Markdown: `**bold**`, `*italic*` and `***bold italic***`. A marker
 * only counts when it touches a word on its inside (so « 5 * 3 * 2 » stays plain text).
 */
export type TextSegment = { text: string; bold: boolean; italic: boolean };

// The words between markers neither start nor end with a space or a `*`.
const WORDS = "([^*\\s](?:[^*]*[^*\\s])?)";
// Longest marker first: `***` (bold italic), then `**` (bold), then `*` (italic).
const FORMATTED_PART = new RegExp(
  `\\*\\*\\*${WORDS}\\*\\*\\*|\\*\\*${WORDS}\\*\\*|\\*${WORDS}\\*`,
  "g",
);

/** Splits a stored text into segments, in reading order. */
export function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let plainStart = 0;
  for (const match of text.matchAll(FORMATTED_PART)) {
    if (match.index > plainStart) {
      segments.push({ text: text.slice(plainStart, match.index), bold: false, italic: false });
    }
    const [, boldItalicText, boldText, italicText] = match;
    if (boldItalicText !== undefined) {
      segments.push({ text: boldItalicText, bold: true, italic: true });
    } else if (boldText !== undefined) {
      segments.push({ text: boldText, bold: true, italic: false });
    } else if (italicText !== undefined) {
      segments.push({ text: italicText, bold: false, italic: true });
    }
    plainStart = match.index + match[0].length;
  }
  if (plainStart < text.length) {
    segments.push({ text: text.slice(plainStart), bold: false, italic: false });
  }
  return segments;
}

/**
 * Writes segments with their markers (the inverse of parseInlineFormatting). Neighbour segments
 * with the same style are merged, and the spaces at the edges of a bold or italic segment are
 * written outside its markers, since a marker must touch a word.
 */
export function formatSegments(segments: TextSegment[]): string {
  return mergeSegments(segments)
    .map((segment) => {
      const marker = markerOf(segment);
      const words = segment.text.trim();
      if (marker === "" || words === "") {
        return segment.text;
      }
      const start = segment.text.indexOf(words);
      const before = segment.text.slice(0, start);
      const after = segment.text.slice(start + words.length);
      return `${before}${marker}${words}${marker}${after}`;
    })
    .join("");
}

/** The text without its markers, for places that show plain text (search, moderation lists). */
export function stripInlineFormatting(text: string): string {
  return parseInlineFormatting(text)
    .map((segment) => segment.text)
    .join("");
}

function markerOf(segment: TextSegment): string {
  if (segment.bold && segment.italic) return "***";
  if (segment.bold) return "**";
  if (segment.italic) return "*";
  return "";
}

/** Joins neighbours with the same style and drops empty segments. */
function mergeSegments(segments: TextSegment[]): TextSegment[] {
  const merged: TextSegment[] = [];
  for (const segment of segments) {
    if (segment.text === "") continue;
    const last = merged.at(-1);
    if (last && last.bold === segment.bold && last.italic === segment.italic) {
      merged[merged.length - 1] = { ...last, text: last.text + segment.text };
    } else {
      merged.push(segment);
    }
  }
  return merged;
}
