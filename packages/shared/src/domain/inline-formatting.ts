/**
 * docs/DECISIONS.md (interface brief): an editor may put words in bold or italic. The text is
 * stored with two markers, as in Markdown: `**bold**` and `*italic*`. A marker only counts when
 * it touches a word on its inside (so « 5 * 3 * 2 » stays plain text). Bold and italic do not nest.
 */
export type TextSegment = { text: string; bold: boolean; italic: boolean };

// `**` + text that neither starts nor ends with a space or a `*` + `**`, or the same with one `*`.
const FORMATTED_PART = /\*\*([^*\s](?:[^*]*[^*\s])?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*/g;

/** Splits a stored text into plain, bold and italic segments, in reading order. */
export function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let plainStart = 0;
  for (const match of text.matchAll(FORMATTED_PART)) {
    if (match.index > plainStart) {
      segments.push({ text: text.slice(plainStart, match.index), bold: false, italic: false });
    }
    const [, boldText, italicText] = match;
    if (boldText !== undefined) {
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

/** Writes segments back with their markers (the inverse of parseInlineFormatting). */
export function formatSegments(segments: TextSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.bold) return `**${segment.text}**`;
      if (segment.italic) return `*${segment.text}*`;
      return segment.text;
    })
    .join("");
}

/** The text without its markers, for places that show plain text (search, moderation lists). */
export function stripInlineFormatting(text: string): string {
  return parseInlineFormatting(text)
    .map((segment) => segment.text)
    .join("");
}
