import type { PostPublic, PostSummaryPublic } from "@fama/shared";
import type { PostImage } from "../generated/prisma/client.js";
import type { PostRecord } from "./post-record.js";

/** docs/DECISIONS.md: images are served by the API, at a path relative to its address. */
export function imagePath(image: Pick<PostImage, "id" | "postId">): string {
  return `/posts/${image.postId}/images/${image.id}`;
}

export function toPostSummaryPublic(post: Omit<PostRecord, "body">): PostSummaryPublic {
  const editorStatus = post.author.editorProfile?.status;
  if (!editorStatus) {
    throw new Error(`Author of post ${post.id} has no editor profile`);
  }
  const cover = post.images[0];
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    summary: post.summary,
    zone: post.zone,
    region: post.region,
    theme: post.theme,
    editor: { id: post.author.id, pseudo: post.author.pseudo, editorStatus },
    coverImage: cover ? { id: cover.id, path: imagePath(cover) } : null,
    commentCount: post._count.comments,
    reviewStatus: post.reviewStatus,
    reportCount: post._count.reports,
    verdict: post.reviewStatus === "REVIEWED" ? (post.reviews[0]?.verdict ?? null) : null,
    createdAt: post.createdAt.toISOString(),
  };
}

export function toPostPublic(post: PostRecord): PostPublic {
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
    // SPEC §7: totals stay hidden until the reader votes (votes arrive in phase 6).
    votes: post.kind === "OPINION" ? { myVote: null, revealedResults: false, results: null } : null,
  };
}
