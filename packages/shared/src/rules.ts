// Business constants from SPEC §11. No other file may hard-code these values.

// SPEC §4.1: the feed shows posts from the last 48 hours.
export const FEED_WINDOW_HOURS = 48;
// SPEC §4.3: the `today` filter is a sliding 24-hour window, not "since midnight".
export const TODAY_WINDOW_HOURS = 24;
// SPEC §4.2 (post-MVP): an editor never appears twice within this many consecutive posts.
export const FEED_SPACING = 4;

// SPEC §6.2: a comment goes UNDER_REVIEW when the sum of report weights reaches this value.
export const COMMENT_REPORT_THRESHOLD = 3;
// SPEC §5.3: review threshold of a post = max(min score, audience ratio × viewCount).
export const POST_REPORT_MIN_SCORE = 5;
export const POST_REPORT_AUDIENCE_RATIO = 0.01;

// SPEC §5.2: report weight.
export const NEW_ACCOUNT_DAYS = 30;
export const REPORT_WEIGHT_NEW_ACCOUNT = 0.2;
export const REPORT_HISTORY_MIN_SAMPLE = 5;
export const REPORT_WEIGHT_MIN = 0.1;
export const REPORT_WEIGHT_MAX = 2.0;

// SPEC §5.5: delay for the editor to reply to or correct a reviewed post.
export const EDITOR_REPLY_HOURS = 48;
// SPEC §8: an assigned ticket without a moderator message goes back to NEW after this delay.
export const TICKET_ASSIGN_TIMEOUT_HOURS = 24;
// SPEC §6.3: sanctions count REMOVED comments over this many months.
export const SANCTION_RESET_MONTHS = 6;

// SPEC §11: provisional lengths.
export const COMMENT_MAX_LENGTH = 2000;
export const POST_TITLE_MAX_LENGTH = 200;
export const POST_SUMMARY_MAX_LENGTH = 500;

// SPEC §6 and §10: purge delay for logically deleted content. To be confirmed with a lawyer.
export const RETENTION_DAYS = 365;
