import { FEED_WINDOW_HOURS, TODAY_WINDOW_HOURS } from "../rules.js";
import { MILLISECONDS_PER_HOUR } from "./time.js";

/**
 * Oldest publication date shown by the feed: SPEC §4.1 (last 48 hours), or the sliding
 * 24 hours of the `today` filter (SPEC §4.3, not "since midnight").
 */
export function feedWindowStart(now: Date, today: boolean): Date {
  const hours = today ? TODAY_WINDOW_HOURS : FEED_WINDOW_HOURS;
  return new Date(now.getTime() - hours * MILLISECONDS_PER_HOUR);
}
