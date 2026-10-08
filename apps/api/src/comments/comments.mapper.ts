import type { CommentPublic, CommentStatus } from "@fama/shared";
import type { Comment, User } from "../generated/prisma/client.js";

// SPEC §6: the content is hidden while under review, and once removed or deleted.
const HIDDEN_CONTENT_STATUSES: readonly CommentStatus[] = ["UNDER_REVIEW", "REMOVED", "DELETED"];

export type CommentRecord = Comment & { author: Pick<User, "pseudo"> };

export function toCommentPublic(comment: CommentRecord): CommentPublic {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    authorId: comment.authorId,
    authorPseudo: comment.author.pseudo,
    content: HIDDEN_CONTENT_STATUSES.includes(comment.status) ? null : comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
  };
}
