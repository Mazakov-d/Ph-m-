import type { PostKind, PostReviewStatus, Verdict } from "../enums.js";
import {
  FEED_FRESHNESS_HALF_LIFE_HOURS,
  FEED_RELIABILITY_FACTORS,
  FEED_SPACING,
} from "../rules.js";
import { MILLISECONDS_PER_HOUR } from "./time.js";

/** What the weighted feed needs to know about a post of the window (SPEC §4.2). */
export type FeedCandidate = {
  id: string;
  editorId: string;
  createdAt: Date;
  kind: PostKind;
  reviewStatus: PostReviewStatus;
  verdict: Verdict | null;
};

/** SPEC §4.2 + docs/DECISIONS.md: 1 when published, halved every 12 hours. */
export function freshnessFactor(ageHours: number): number {
  return 0.5 ** (Math.max(0, ageHours) / FEED_FRESHNESS_HALF_LIFE_HOURS);
}

/**
 * SPEC §4.2 + docs/DECISIONS.md: a reviewed article weighs according to its verdict, one under
 * review weighs half. An opinion never gets a verdict (SPEC §5): its factor is neutral.
 */
export function reliabilityFactor(post: Pick<FeedCandidate, "kind" | "reviewStatus" | "verdict">) {
  if (post.kind === "OPINION") return FEED_RELIABILITY_FACTORS.OPINION;
  if (post.reviewStatus === "UNDER_REVIEW") return FEED_RELIABILITY_FACTORS.UNDER_REVIEW;
  if (post.reviewStatus === "REVIEWED" && post.verdict) {
    return FEED_RELIABILITY_FACTORS[post.verdict];
  }
  return FEED_RELIABILITY_FACTORS.NOT_REVIEWED;
}

/**
 * SPEC §4.2: weight = f(freshness, reliability) / √n, n being the number of posts of the same
 * editor among the candidates, so that a prolific editor does not fill the feed.
 */
export function feedWeights(candidates: FeedCandidate[], now: Date): Map<string, number> {
  const postsPerEditor = new Map<string, number>();
  for (const post of candidates) {
    postsPerEditor.set(post.editorId, (postsPerEditor.get(post.editorId) ?? 0) + 1);
  }
  const weights = new Map<string, number>();
  for (const post of candidates) {
    const ageHours = (now.getTime() - post.createdAt.getTime()) / MILLISECONDS_PER_HOUR;
    const editorPosts = postsPerEditor.get(post.editorId) ?? 1;
    weights.set(
      post.id,
      (freshnessFactor(ageHours) * reliabilityFactor(post)) / Math.sqrt(editorPosts),
    );
  }
  return weights;
}

/**
 * A random number generator that always gives the same numbers for the same seed (mulberry32,
 * seeded with an FNV-1a hash of the text): a reader keeps the same draw while scrolling.
 */
export function seededRandom(seed: string): () => number {
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 0x01000193);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * SPEC §4.2: weighted draw without replacement. Each post gets the key u^(1/weight), u being
 * random in [0, 1); sorting the keys from the largest gives each post its chance of coming
 * first in proportion to its weight (Efraimidis and Spirakis).
 */
export function weightedDraw(
  items: { id: string; weight: number }[],
  random: () => number,
): string[] {
  return items
    .map((item) => ({ id: item.id, key: random() ** (1 / item.weight) }))
    .sort((a, b) => b.key - a.key || a.id.localeCompare(b.id))
    .map((item) => item.id);
}

/**
 * SPEC §4.2: an editor appears at most once in FEED_SPACING consecutive posts. Each place takes
 * the first drawn post whose editor is not among the previous ones, except when an editor has
 * so many posts left that they would no longer fit with the spacing: that editor goes first.
 * When every remaining post breaks the rule (too few editors), the first remaining one is taken.
 */
export function spaceEditors<Post extends { editorId: string }>(
  drawn: Post[],
  spacing: number = FEED_SPACING,
): Post[] {
  const remaining = [...drawn];
  const spaced: Post[] = [];
  while (remaining.length > 0) {
    const recentEditors = spaced.slice(-(spacing - 1)).map((post) => post.editorId);
    const allowed = (post: Post) => !recentEditors.includes(post.editorId);
    // k posts of one editor need (k - 1) × spacing + 1 places: with no place to spare, now.
    const mustGoNow = (post: Post) => {
      const left = remaining.filter((other) => other.editorId === post.editorId).length;
      return (left - 1) * spacing + 1 >= remaining.length;
    };
    const urgent = remaining.findIndex((post) => allowed(post) && mustGoNow(post));
    const index = urgent >= 0 ? urgent : remaining.findIndex(allowed);
    const [next] = remaining.splice(Math.max(index, 0), 1);
    if (next) spaced.push(next);
  }
  return spaced;
}

/** SPEC §4.2: the order of the weighted feed for a reader's draw (`seed`). */
export function weightedFeedOrder(candidates: FeedCandidate[], now: Date, seed: string): string[] {
  const weights = feedWeights(candidates, now);
  const drawnIds = weightedDraw(
    candidates.map((post) => ({ id: post.id, weight: weights.get(post.id) ?? 0 })),
    seededRandom(seed),
  );
  const byId = new Map(candidates.map((post) => [post.id, post]));
  const drawn = drawnIds.flatMap((id) => {
    const post = byId.get(id);
    return post ? [post] : [];
  });
  return spaceEditors(drawn).map((post) => post.id);
}
