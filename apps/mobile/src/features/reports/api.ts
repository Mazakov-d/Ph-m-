import { type CreatePostReportInput, reportPublicSchema } from "@fama/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { postKeys } from "../posts/api";

/** SPEC §5.1: report a post (the post detail then shows it as reported). */
export function useReportPost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostReportInput) =>
      apiClient.post(`/posts/${postId}/reports`, input, reportPublicSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
  });
}
