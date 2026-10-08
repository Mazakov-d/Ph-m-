/** Markers written around a selection by the « B » and « I » buttons (shared/domain/inline-formatting). */
export const FORMAT_MARKERS = { bold: "**", italic: "*" } as const;

export type TextSelection = { start: number; end: number };

/**
 * Puts `marker` around the selected words. The spaces at the edges of the selection stay outside
 * (a marker must touch a word). With nothing selected, both markers are inserted at the cursor.
 */
export function wrapSelection(text: string, selection: TextSelection, marker: string): string {
  let start = Math.min(selection.start, selection.end);
  let end = Math.max(selection.start, selection.end);
  while (start < end && text.charAt(start) === " ") start += 1;
  while (end > start && text.charAt(end - 1) === " ") end -= 1;
  return `${text.slice(0, start)}${marker}${text.slice(start, end)}${marker}${text.slice(end)}`;
}
