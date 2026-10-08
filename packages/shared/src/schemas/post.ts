import { z } from "zod";
import { PostKind, PostReviewStatus, Theme, Verdict, Zone } from "../enums.js";
import {
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

// SPEC §3: title, summary, body, sources (≥ 1), zone, theme and kind are mandatory.
// Images are uploaded separately. For an OPINION the API forces commentsEnabled to true.
export const createPostInputSchema = z
  .object({
    kind: PostKind,
    title: z.string().trim().min(1).max(POST_TITLE_MAX_LENGTH),
    summary: z.string().trim().min(1).max(POST_SUMMARY_MAX_LENGTH),
    body: z.string().trim().min(1).max(POST_BODY_MAX_LENGTH),
    sources: z.array(sourceSchema).min(1).max(SOURCES_MAX_COUNT),
    zone: Zone,
    region: z.string().trim().min(1).max(REGION_MAX_LENGTH).nullable(),
    theme: Theme,
    commentsEnabled: z.boolean().default(true),
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

// SPEC §4.3: combinable filters of the feed. `today` comes from the query string ("true"/"false").
export const postQuerySchema = cursorQuerySchema.extend({
  today: z.stringbool().default(false),
  zone: Zone.optional(),
  theme: Theme.optional(),
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

/** Post card of the feed (SPEC §4, ROADMAP phase 4): no body. */
export const postSummaryPublicSchema = z.object({
  id: idSchema,
  kind: PostKind,
  title: z.string(),
  summary: z.string(),
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
});
export type PostPublic = z.infer<typeof postPublicSchema>;
