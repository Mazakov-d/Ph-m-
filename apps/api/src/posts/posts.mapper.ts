import {
  bodyExcerpt,
  type EditorReliabilityLevel,
  feedCardThirdBlock,
  type PostPublic,
  type PostSummaryPublic,
  type PostVideoPublic,
  type VoteSummaryPublic,
} from "@fama/shared";
import type { PostImage, PostVideo } from "../generated/prisma/client.js";
import type { PostRecord } from "./post-record.js";

/** docs/DECISIONS.md: images are served by the API, at a path relative to its address. */
export function imagePath(image: Pick<PostImage, "id" | "postId">): string {
  return `/posts/${image.postId}/images/${image.id}`;
}

/** docs/DECISIONS.md (videos): the video and its still image, served by the API. */
function toVideoPublic(video: PostVideo | null): PostVideoPublic | null {
  if (!video) return null;
  return {
    path: `/posts/${video.postId}/video`,
    posterPath: `/posts/${video.postId}/video/poster`,
    durationSeconds: video.durationSeconds,
  };
}

export function toPostSummaryPublic(post: PostRecord): PostSummaryPublic {
  const editorStatus = post.author.editorProfile?.status;
  if (!editorStatus) {
    throw new Error(`Author of post ${post.id} has no editor profile`);
  }
  const cover = post.images[0];
  // docs/DECISIONS.md (interface brief): the card shows the pictures or the start of the article.
  const thirdBlock = feedCardThirdBlock(post.layout, post.images.length > 0 || post.video !== null);
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    summary: post.summary,
    bodyExcerpt: thirdBlock === "BODY" ? bodyExcerpt(post.body) : null,
    layout: post.layout,
    typefaces: {
      title: post.titleTypeface,
      summary: post.summaryTypeface,
      body: post.bodyTypeface,
    },
    zone: post.zone,
    region: post.region,
    theme: post.theme,
    editor: { id: post.author.id, pseudo: post.author.pseudo, editorStatus },
    coverImage: cover ? { id: cover.id, path: imagePath(cover) } : null,
    video: toVideoPublic(post.video),
    commentCount: post._count.comments,
    reviewStatus: post.reviewStatus,
    reportCount: post._count.reports,
    verdict: post.reviewStatus === "REVIEWED" ? (post.reviews[0]?.verdict ?? null) : null,
    createdAt: post.createdAt.toISOString(),
  };
}

/**
 * `votes` is the reader's view of the vote, for an opinion (null for an article);
 * `viewerHasReported` tells whether the reader already reported the post; `editorReliability`
 * is the gauge of its editor (SPEC §5.7).
 */
export function toPostPublic(
  post: PostRecord,
  votes: VoteSummaryPublic | null,
  viewerHasReported: boolean,
  editorReliability: EditorReliabilityLevel,
  editorDonationUrl: string | null,
): PostPublic {
  return {
    ...toPostSummaryPublic(post),
    body: post.body,
    sources: post.sources.map((source) => source.value),
    images: post.images.map((image) => ({ id: image.id, path: imagePath(image) })),
    commentsEnabled: post.commentsEnabled,
    corrections: post.corrections.map((correction) => ({
      id: correction.id,
      content: correction.content,
      createdAt: correction.createdAt.toISOString(),
    })),
    votes,
    viewerHasReported,
    editorReliability,
    editorDonationUrl,
  };
}
