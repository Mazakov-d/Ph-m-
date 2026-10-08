import {
  type CommentDecisionInput,
  commentModerationSchema,
  moderationDecisionResultSchema,
  type PostModerationDecisionInput,
  reviewQueueItemModerationSchema,
  sanctionAppealModerationSchema,
  sanctionPublicSchema,
} from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { commentKeys } from "../comments/api";
import { postKeys } from "../posts/api";

export const moderationKeys = {
  all: ["moderation", "contents"] as const,
  comments: () => [...moderationKeys.all, "comments"] as const,
  opinions: () => [...moderationKeys.all, "opinions"] as const,
  sanctionAppeals: () => [...moderationKeys.all, "sanction-appeals"] as const,
};

function useRefreshModeration() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: moderationKeys.all }),
      queryClient.invalidateQueries({ queryKey: commentKeys.all }),
      queryClient.invalidateQueries({ queryKey: postKeys.all }),
    ]);
}

export function useCommentQueue() {
  return useQuery({
    queryKey: moderationKeys.comments(),
    queryFn: () => apiClient.get("/moderation/comments", z.array(commentModerationSchema)),
  });
}

export function useOpinionQueue() {
  return useQuery({
    queryKey: moderationKeys.opinions(),
    queryFn: () => apiClient.get("/moderation/posts", z.array(reviewQueueItemModerationSchema)),
  });
}

export function useSanctionAppeals() {
  return useQuery({
    queryKey: moderationKeys.sanctionAppeals(),
    queryFn: () =>
      apiClient.get("/moderation/sanction-appeals", z.array(sanctionAppealModerationSchema)),
  });
}

export function useDecideComment() {
  const refresh = useRefreshModeration();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CommentDecisionInput }) =>
      apiClient.post(`/moderation/comments/${id}/decision`, input, moderationDecisionResultSchema),
    onSuccess: refresh,
  });
}

export function useDecideOpinion() {
  const refresh = useRefreshModeration();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PostModerationDecisionInput }) =>
      apiClient.post(`/moderation/posts/${id}/decision`, input, moderationDecisionResultSchema),
    onSuccess: refresh,
  });
}

export function useDecideSanctionAppeal() {
  const refresh = useRefreshModeration();
  return useMutation({
    mutationFn: ({ id, accepted }: { id: string; accepted: boolean }) =>
      apiClient.post(
        `/moderation/sanction-appeals/${id}/decision`,
        { accepted },
        sanctionPublicSchema,
      ),
    onSuccess: refresh,
  });
}
