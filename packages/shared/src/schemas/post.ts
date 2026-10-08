import { z } from "zod";
import {
  PostKind,
  PostLayout,
  PostReviewStatus,
  Theme,
  Typeface,
  Verdict,
  Zone,
} from "../enums.js";
import {
  DEFAULT_POST_LAYOUT,
  DEFAULT_TYPEFACES,
  FEED_SEED_MAX_LENGTH,
  POST_BODY_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  REGION_MAX_LENGTH,
  SOURCES_MAX_COUNT,
  VOTE_OPTIONS_MAX,
  VOTE_OPTIONS_MIN,
} from "../rules.js";
import { cursorQuerySchema, idSchema, isoDateTimeSchema, sourceSchema } from "./common.js";
import { editorSummaryPublicSchema } from "./editor.js";
import { voteOptionLabelSchema, voteSummaryPublicSchema } from "./vote.js";

// docs/DECISIONS.md (interface brief): one typeface per text block, chosen by the editor.
export const postTypefacesSchema = z.object({
  title: Typeface,
  summary: Typeface,
  body: Typeface,
});
export type PostTypefaces = z.infer<typeof postTypefacesSchema>;

// SPEC §3: title, summary, body, sources (≥ 1 for an article), zone, theme and kind are mandatory.
// Images are uploaded separately. For an OPINION the API forces commentsEnabled to true.
export const createPostInputSchema = z
  .object({
    kind: PostKind,
    title: z.string().trim().min(1).max(POST_TITLE_MAX_LENGTH),
    summary: z.string().trim().min(1).max(POST_SUMMARY_MAX_LENGTH),
    body: z.string().trim().min(1).max(POST_BODY_MAX_LENGTH),
    // SPEC §3: at least one source for an article, optional for an opinion (see below).
    sources: z.array(sourceSchema).max(SOURCES_MAX_COUNT),
    zone: Zone,
    region: z.string().trim().min(1).max(REGION_MAX_LENGTH).nullable(),
    theme: Theme,
    commentsEnabled: z.boolean().default(true),
    // docs/DECISIONS.md (interface brief): the editor chooses the order of the blocks and the
    // typefaces; bold and italic are written in the texts (domain/inline-formatting.ts).
    layout: PostLayout.default(DEFAULT_POST_LAYOUT),
    typefaces: postTypefacesSchema.default(DEFAULT_TYPEFACES),
    // SPEC §7: answer choices of an opinion; the defaults apply when omitted.
    voteOptions: z
      .array(voteOptionLabelSchema)
      .min(VOTE_OPTIONS_MIN)
      .max(VOTE_OPTIONS_MAX)
      .optional(),
  })
  // SPEC §3: a region is given if and only if the zone is LOCAL.
  .refine((post) => (post.zone === "LOCAL") === (post.region !== null), {
    path: ["region"],
    message: "Region is required for a LOCAL zone and forbidden otherwise",
  })
  // SPEC §1 and §3: an article always cites at least one source.
  .refine((post) => post.kind === "OPINION" || post.sources.length > 0, {
    path: ["sources"],
    message: "An article needs at least one source",
  })
  // SPEC §7: only an opinion has answer choices.
  .refine((post) => post.kind === "OPINION" || post.voteOptions === undefined, {
    path: ["voteOptions"],
    message: "Only an opinion has answer choices",
  })
  // SPEC §7: two choices of the same opinion cannot be the same (case ignored).
  .refine(
    (post) => {
      const labels = (post.voteOptions ?? []).map((label) => label.toLocaleLowerCase("fr"));
      return new Set(labels).size === labels.length;
    },
    { path: ["voteOptions"], message: "Answer choices must be distinct" },
  );
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// SPEC §3: the editor chooses commentsEnabled on their articles.
export const updatePostCommentsInputSchema = z.object({
  commentsEnabled: z.boolean(),
});
export type UpdatePostCommentsInput = z.infer<typeof updatePostCommentsInputSchema>;

// docs/DECISIONS.md: anonymous readers send a random per-session id, so that a reader who opens
// a post twice is counted once (SPEC §3: unique readers).
export const VIEWER_SESSION_HEADER = "x-fama-session";

// docs/DECISIONS.md (SPEC §4.2): the feed is chronological (RECENT) by default; « À la une »
// (WEIGHTED) is the weighted draw.
export const FeedSort = z.enum(["RECENT", "WEIGHTED"]);
export type FeedSort = z.infer<typeof FeedSort>;

// SPEC §4.3: combinable filters of the feed. `today` comes from the query string ("true"/"false").
// `seed` fixes the weighted draw of a reader while they scroll (a new one gives a new draw).
export const postQuerySchema = cursorQuerySchema.extend({
  today: z.stringbool().default(false),
  zone: Zone.optional(),
  theme: Theme.optional(),
  sort: FeedSort.default("RECENT"),
  seed: z.string().min(1).max(FEED_SEED_MAX_LENGTH).optional(),
});
export type PostQuery = z.infer<typeof postQuerySchema>;

// docs/DECISIONS.md: images are served by the API; `path` is relative to the API address.
export const postImagePublicSchema = z.object({
  id: idSchema,
  path: z.string().startsWith("/"),
});
export type PostImagePublic = z.infer<typeof postImagePublicSchema>;

export const postCorrectionPublicSchema = z.object({
  id: idSchema,
  content: z.string(),
  createdAt: isoDateTimeSchema,
});
export type PostCorrectionPublic = z.infer<typeof postCorrectionPublicSchema>;

/**
 * Post card of the feed (SPEC §4, ROADMAP phase 4): no full body. docs/DECISIONS.md (interface
 * brief): the card shows the first three blocks; `bodyExcerpt` is set when the third one is the
 * article (domain/post-layout.ts), null when it is the pictures.
 */
export const postSummaryPublicSchema = z.object({
  id: idSchema,
  kind: PostKind,
  title: z.string(),
  summary: z.string(),
  bodyExcerpt: z.string().nullable(),
  layout: PostLayout,
  typefaces: postTypefacesSchema,
  zone: Zone,
  region: z.string().nullable(),
  theme: Theme,
  editor: editorSummaryPublicSchema,
  coverImage: postImagePublicSchema.nullable(),
  commentCount: z.number().int().nonnegative(),
  // SPEC §5.6: what the reliability bar needs (count shown publicly, never the weights).
  reviewStatus: PostReviewStatus,
  reportCount: z.number().int().nonnegative(),
  verdict: Verdict.nullable(),
  createdAt: isoDateTimeSchema,
});
export type PostSummaryPublic = z.infer<typeof postSummaryPublicSchema>;

/** Full post. `votes` is null for an ARTICLE. */
export const postPublicSchema = postSummaryPublicSchema.extend({
  body: z.string(),
  sources: z.array(z.string()),
  images: z.array(postImagePublicSchema),
  commentsEnabled: z.boolean(),
  corrections: z.array(postCorrectionPublicSchema),
  votes: voteSummaryPublicSchema.nullable(),
  // SPEC §5.1: one report per account and post (the « Signaler » button shows it).
  viewerHasReported: z.boolean(),
});
export type PostPublic = z.infer<typeof postPublicSchema>;
