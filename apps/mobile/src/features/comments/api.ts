import {
  commentPublicSchema,
  commentThreadPublicSchema,
  type CreateCommentInput,
  paginated,
} from "@fama/shared";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { postKeys } from "../posts/api";

const threadsPageSchema = paginated(commentThreadPublicSchema);
// The first page has no cursor.
const FIRST_PAGE: string | null = null;

export const commentKeys = {
  all: ["comments"] as const,
  byPost: (postId: string) => [...commentKeys.all, "post", postId] as const,
};

/** SPEC §6: threads of a post, oldest first, page by page. */
export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: commentKeys.byPost(postId),
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiClient.get(`/posts/${postId}/comments?${params}`, threadsPageSchema);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** After a change, the threads and the post's comment counter are reloaded. */
function useRefreshComments(postId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: commentKeys.byPost(postId) }),
      queryClient.invalidateQueries({ queryKey: postKeys.all }),
    ]);
}

export function useCreateComment(postId: string) {
  const refresh = useRefreshComments(postId);
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiClient.post("/comments", input, commentPublicSchema),
    onSuccess: refresh,
  });
}

export function useDeleteComment(postId: string) {
  const refresh = useRefreshComments(postId);
  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.delete(`/comments/${commentId}`, commentPublicSchema),
    onSuccess: refresh,
  });
}
