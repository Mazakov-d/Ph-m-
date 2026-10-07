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
// SPEC §5.4: priority = score × log10(viewCount + offset).
export const REVIEW_PRIORITY_VIEW_OFFSET = 10;
// Technical: tolerance when comparing sums of decimal weights to a threshold
// (in floating point, 15 × 0.2 = 2.9999999999999996, which must count as 3).
export const SCORE_EPSILON = 1e-9;

// SPEC §5.2: report weight.
export const NEW_ACCOUNT_DAYS = 30;
export const REPORT_WEIGHT_NEW_ACCOUNT = 0.2;
// Weight of an account with too short a report history (formula of SPEC §5.2, not in the §11 table).
export const REPORT_WEIGHT_DEFAULT = 1.0;
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

// docs/DECISIONS.md: session lifetimes.
export const ACCESS_TOKEN_TTL_MINUTES = 15;
export const REFRESH_TOKEN_TTL_DAYS = 30;

// Provisional limits not set by the SPEC (docs/DECISIONS.md, "Limites provisoires des schémas").
export const PSEUDO_MIN_LENGTH = 3;
export const PSEUDO_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const POST_BODY_MAX_LENGTH = 50_000;
export const SOURCES_MAX_COUNT = 20;
export const SOURCE_MAX_LENGTH = 500;
export const REGION_MAX_LENGTH = 100;
export const REPORT_DETAILS_MAX_LENGTH = 1000;
export const REVIEW_NOTE_MAX_LENGTH = 5000;
export const EDITOR_REPLY_MAX_LENGTH = 5000;
export const APPEAL_MAX_LENGTH = 2000;
export const MESSAGE_MAX_LENGTH = 4000;
export const EDITORIAL_LINE_MAX_LENGTH = 2000;
export const NAME_MAX_LENGTH = 200;
export const REJECTION_REASON_MAX_LENGTH = 1000;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

// docs/DECISIONS.md: identity documents of an editor application.
export const EDITOR_DOCUMENTS_MIN_COUNT = 1;
export const EDITOR_DOCUMENTS_MAX_COUNT = 5;
export const EDITOR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const EDITOR_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

// SPEC §6 and §10: purge delay for logically deleted content. To be confirmed with a lawyer.
export const RETENTION_DAYS = 365;
