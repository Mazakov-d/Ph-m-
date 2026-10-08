import { type PostPublic, type VoteSummaryPublic, voteSummaryPublicSchema } from "@fama/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { postKeys } from "../posts/api";

/** The post in cache takes the new vote summary, without reloading it. */
function useStoreVoteSummary(postId: string) {
  const queryClient = useQueryClient();
  return (votes: VoteSummaryPublic) =>
    queryClient.setQueryData<PostPublic>(postKeys.detail(postId), (post) =>
      post ? { ...post, votes } : post,
    );
}

/** SPEC §7: a final vote. */
export function useCastVote(postId: string) {
  const storeVoteSummary = useStoreVoteSummary(postId);
  return useMutation({
    mutationFn: (optionId: string) =>
      apiClient.put(`/posts/${postId}/vote`, { optionId }, voteSummaryPublicSchema),
    onSuccess: storeVoteSummary,
  });
}

/** SPEC §7: « Voir sans voter », final too. */
export function useRevealResults(postId: string) {
  const storeVoteSummary = useStoreVoteSummary(postId);
  return useMutation({
    mutationFn: () => apiClient.post(`/posts/${postId}/vote/reveal`, {}, voteSummaryPublicSchema),
    onSuccess: storeVoteSummary,
  });
}
