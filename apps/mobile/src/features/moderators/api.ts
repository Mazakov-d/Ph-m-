import { type CreateModeratorInput, moderatorModerationSchema } from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";

const moderatorKeys = { all: ["moderators"] as const };

/** docs/DECISIONS.md (moderators): the moderator accounts, for the ADMIN. */
export function useModerators() {
  return useQuery({
    queryKey: moderatorKeys.all,
    queryFn: () => apiClient.get("/admin/moderators", z.array(moderatorModerationSchema)),
  });
}

export function useCreateModerator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModeratorInput) =>
      apiClient.post("/admin/moderators", input, moderatorModerationSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moderatorKeys.all }),
  });
}
