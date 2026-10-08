import { postCorrectionPublicSchema, reviewPublicSchema } from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { postKeys } from "../posts/api";

export const reviewKeys = {
  byPost: (postId: string) => ["reviews", "post", postId] as const,
};

/** SPEC §5.6: the « Pourquoi ? » content of a reviewed article. */
export function useReview(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.byPost(postId),
    enabled,
    queryFn: () => apiClient.get(`/posts/${postId}/review`, reviewPublicSchema),
  });
}

export type EditorReviewAction = "reply" | "correction" | "appeal";

const PATHS: Record<EditorReviewAction, string> = {
  reply: "review/reply",
  correction: "corrections",
  appeal: "review/appeal",
};

/** SPEC §5.5: the editor's reply, correction or appeal, within 48 hours of the verdict. */
export function useEditorReviewAction(postId: string, action: EditorReviewAction) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string): Promise<void> => {
      const path = `/posts/${postId}/${PATHS[action]}`;
      if (action === "correction") {
        await apiClient.post(path, { content: text }, postCorrectionPublicSchema);
        return;
      }
      const body = action === "appeal" ? { reason: text } : { content: text };
      await apiClient.post(path, body, reviewPublicSchema);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewKeys.byPost(postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      ]),
  });
}
