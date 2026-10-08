// Business constants from SPEC §11. No other file may hard-code these values.

// SPEC §4.1: the feed shows posts from the last 48 hours.
export const FEED_WINDOW_HOURS = 48;
// SPEC §4.3: the `today` filter is a sliding 24-hour window, not "since midnight".
export const TODAY_WINDOW_HOURS = 24;
// SPEC §4.2 (post-MVP): an editor never appears twice within this many consecutive posts.
export const FEED_SPACING = 4;
// docs/DECISIONS.md (SPEC §4.2): weight of a post in the weighted feed (« À la une »). Freshness
// halves every FEED_FRESHNESS_HALF_LIFE_HOURS; reliability multiplies it by the factor below.
export const FEED_FRESHNESS_HALF_LIFE_HOURS = 12;
export const FEED_RELIABILITY_FACTORS = {
  NOT_REVIEWED: 1,
  UNDER_REVIEW: 0.5,
  ACCURATE: 1.2,
  MISSING_CONTEXT: 0.7,
  UNVERIFIABLE: 0.6,
  MISLEADING: 0.3,
  FALSE: 0.1,
  OPINION: 1,
} as const;
export const FEED_SEED_MAX_LENGTH = 64;

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
// docs/DECISIONS.md: delay for the editor to appeal a verdict.
export const EDITOR_APPEAL_HOURS = 48;
// SPEC §8: an assigned ticket without a moderator message goes back to NEW after this delay.
export const TICKET_ASSIGN_TIMEOUT_HOURS = 24;
// SPEC §6.3: sanctions count REMOVED comments over this many months.
export const SANCTION_RESET_MONTHS = 6;
// SPEC §6.3: length of the suspensions.
export const SUSPENSION_24H_HOURS = 24;
export const SUSPENSION_7D_HOURS = 7 * 24;

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

// docs/DECISIONS.md (interface brief): characters of the article shown on a feed card.
export const FEED_BODY_EXCERPT_LENGTH = 280;
// docs/DECISIONS.md (interface brief): blocks order and typefaces when the editor keeps the defaults.
export const DEFAULT_POST_LAYOUT = "TEXT_FIRST";
export const DEFAULT_TYPEFACES = {
  title: "MERRIWEATHER",
  summary: "INTER",
  body: "MERRIWEATHER",
} as const;
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

// docs/DECISIONS.md: images of a post (metadata stripped, wide images reduced by the API).
export const POST_IMAGES_MAX_COUNT = 4;
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const POST_IMAGE_MAX_WIDTH = 2000;

// SPEC §7: answer choices of an opinion, set by its editor when publishing.
export const VOTE_OPTIONS_MIN = 2;
export const VOTE_OPTIONS_MAX = 4;
export const VOTE_OPTION_LABEL_MAX_LENGTH = 50;
export const DEFAULT_VOTE_OPTIONS = ["D'accord", "Pas d'accord"] as const;

// docs/DECISIONS.md: search (SPEC §4.4).
export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const SEARCH_POSTS_MAX = 20;
export const SEARCH_EDITORS_MAX = 5;

// docs/DECISIONS.md: rate limits (requests per window).
export const RATE_LIMIT_REGISTER = { limit: 5, windowMinutes: 60 } as const;
export const RATE_LIMIT_LOGIN = { limit: 10, windowMinutes: 15 } as const;
export const RATE_LIMIT_COMMENT = { limit: 10, windowMinutes: 1 } as const;
export const RATE_LIMIT_REPORT = { limit: 20, windowMinutes: 60 } as const;

// SPEC §10 + docs/DECISIONS.md: what a deleted account is called (reserved at sign-up).
export const DELETED_ACCOUNT_PSEUDO = "Compte supprimé";

// SPEC §6 and §10: purge delay for logically deleted content. To be confirmed with a lawyer.
export const RETENTION_DAYS = 365;

// SPEC §5.7 + docs/DECISIONS.md: reliability gauge of an editor account (post-MVP). The verdicts
// of the last EDITOR_RELIABILITY_WINDOW_MONTHS move a score that starts at 50 out of 100.
export const EDITOR_RELIABILITY_START = 50;
export const EDITOR_RELIABILITY_MAX = 100;
export const EDITOR_RELIABILITY_WINDOW_MONTHS = 12;
export const EDITOR_RELIABILITY_POINTS = {
  ACCURATE: 2,
  MISSING_CONTEXT: -1,
  UNVERIFIABLE: 0,
  MISLEADING: -5,
  FALSE: -10,
} as const;
// A penalty is halved when the editor had published a correction before the verdict.
export const EDITOR_RELIABILITY_CORRECTION_FACTOR = 0.5;
// The oldest verdict of the window still counts for a quarter (linear decrease from 1).
export const EDITOR_RELIABILITY_OLDEST_WEIGHT = 0.25;
export const EDITOR_RELIABILITY_MIN_VERDICTS = 3;
export const EDITOR_RELIABILITY_VERY_RELIABLE_MIN = 60;
export const EDITOR_RELIABILITY_RELIABLE_MIN = 45;

// SPEC §9 + docs/DECISIONS.md: « Voir les similaires ». Same zone (and region) and theme, at
// least SIMILAR_POSTS_MIN_SHARED_WORDS significant words in common in the title and summary,
// published within SIMILAR_POSTS_WINDOW_DAYS of the post; at most SIMILAR_POSTS_MAX shown.
export const SIMILAR_POSTS_WINDOW_DAYS = 7;
export const SIMILAR_POSTS_MIN_SHARED_WORDS = 2;
export const SIMILAR_POSTS_MAX = 5;

// docs/DECISIONS.md (push notifications): alerts on new posts by theme and/or zone.
export const ALERTS_MAX = 10;
// Alert notifications per account over a sliding 24 hours (other notifications are not capped).
export const ALERT_NOTIFICATIONS_PER_DAY = 10;
export const PUSH_TOKEN_MAX_LENGTH = 200;

// docs/DECISIONS.md (videos): one video per post, MP4 or MOV (the formats of phones), cleaned
// of its metadata and converted to MP4 (H.264, at most POST_VIDEO_MAX_WIDTH wide) by the API.
export const POST_VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const POST_VIDEO_MAX_SECONDS = 180;
export const POST_VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;
export const POST_VIDEO_MAX_WIDTH = 1280;
