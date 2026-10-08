import { MILLISECONDS_PER_HOUR } from "./time.js";

/**
 * SPEC §5.5 + docs/DECISIONS.md: true while the editor may still act on a verdict (reply,
 * correction, appeal): strictly less than `hours` after the verdict.
 */
export function isWithinEditorWindow(verdictAt: Date, now: Date, hours: number): boolean {
  return now.getTime() - verdictAt.getTime() < hours * MILLISECONDS_PER_HOUR;
}
