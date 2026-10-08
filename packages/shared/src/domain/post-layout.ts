import type { PostLayout } from "../enums.js";
import { FEED_BODY_EXCERPT_LENGTH } from "../rules.js";
import { formatSegments, parseInlineFormatting, type TextSegment } from "./inline-formatting.js";

/**
 * docs/DECISIONS.md (interface brief): a feed card shows the first three blocks of the post:
 * title, summary, then the pictures (MEDIA_FIRST) or the article (TEXT_FIRST). A post without
 * pictures always shows its article.
 */
export function feedCardThirdBlock(layout: PostLayout, hasImages: boolean): "MEDIA" | "BODY" {
  return layout === "MEDIA_FIRST" && hasImages ? "MEDIA" : "BODY";
}

/**
 * The beginning of the article for a feed card, cut on a space and followed by « … ».
 * The cut is made on the visible text, so a bold or italic part is never left half-open.
 */
export function bodyExcerpt(body: string, maxLength: number = FEED_BODY_EXCERPT_LENGTH): string {
  const segments = parseInlineFormatting(body);
  const visibleLength = segments.reduce((total, segment) => total + segment.text.length, 0);
  if (visibleLength <= maxLength) {
    return body;
  }
  const kept: TextSegment[] = [];
  let remaining = maxLength;
  for (const segment of segments) {
    if (segment.text.length <= remaining) {
      kept.push(segment);
      remaining -= segment.text.length;
      continue;
    }
    const cut = cutBeforeWord(segment.text, remaining);
    // A first segment without any space is cut in the middle rather than dropped.
    const text = cut === "" && kept.length === 0 ? segment.text.slice(0, remaining) : cut;
    kept.push({ ...segment, text });
    break;
  }
  return `${formatSegments(trimLastSegment(kept))}…`;
}

/** The first `length` characters of `text`, without a word cut in the middle. */
function cutBeforeWord(text: string, length: number): string {
  const head = text.slice(0, length);
  const nextCharacter = text.charAt(length);
  if (nextCharacter === " " || nextCharacter === "") {
    return head;
  }
  const lastSpace = head.lastIndexOf(" ");
  return lastSpace >= 0 ? head.slice(0, lastSpace) : "";
}

/** Removes the spaces before « … » and the segments left empty by the cut. */
function trimLastSegment(segments: TextSegment[]): TextSegment[] {
  const result = segments.filter((segment) => segment.text !== "");
  const last = result.at(-1);
  if (last && (last.bold || last.italic)) {
    // A marker must touch a word: « **mot ** » would no longer be bold.
    result[result.length - 1] = { ...last, text: last.text.trim() };
  } else if (last) {
    result[result.length - 1] = { ...last, text: last.text.trimEnd() };
  }
  return result.filter((segment) => segment.text !== "");
}
