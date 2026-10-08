import {
  appealModerationSchema,
  type CreateReviewInput,
  reviewPublicSchema,
  reviewQueueItemModerationSchema,
} from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { postKeys } from "../posts/api";

export const moderationReviewKeys = {
  all: ["moderation", "reviews"] as const,
  queue: () => [...moderationReviewKeys.all, "queue"] as const,
  appeals: () => [...moderationReviewKeys.all, "appeals"] as const,
};

/** SPEC §5.4: articles under review, highest priority first. */
export function useReviewQueue() {
  return useQuery({
    queryKey: moderationReviewKeys.queue(),
    queryFn: () =>
      apiClient.get("/moderation/post-reviews", z.array(reviewQueueItemModerationSchema)),
  });
}

/** docs/DECISIONS.md: appeals for another moderator. */
export function useAppeals() {
  return useQuery({
    queryKey: moderationReviewKeys.appeals(),
    queryFn: () => apiClient.get("/moderation/appeals", z.array(appealModerationSchema)),
  });
}

/** A verdict on an article (`kind: "post"`) or on an appeal (`kind: "appeal"`). */
export function useGiveVerdict(target: { kind: "post" | "appeal"; id: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => {
      const path =
        target.kind === "post"
          ? `/moderation/post-reviews/${target.id}/verdict`
          : `/moderation/appeals/${target.id}/decision`;
      return apiClient.post(path, input, reviewPublicSchema);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: moderationReviewKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
      ]),
  });
}
