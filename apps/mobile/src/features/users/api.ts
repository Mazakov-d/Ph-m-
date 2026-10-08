import { blockPublicSchema } from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { commentKeys } from "../comments/api";
import { postKeys } from "../posts/api";

export const blockKeys = { mine: () => ["blocks", "mine"] as const };

/** After a block or unblock, everything that hides blocked users is reloaded. */
function useRefreshAfterBlock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: blockKeys.mine() }),
      queryClient.invalidateQueries({ queryKey: commentKeys.all }),
      queryClient.invalidateQueries({ queryKey: postKeys.all }),
    ]);
}

export function useBlocks() {
  return useQuery({
    queryKey: blockKeys.mine(),
    queryFn: () => apiClient.get("/users/me/blocks", z.array(blockPublicSchema)),
  });
}

/** SPEC §10: hide a user's posts and comments. */
export function useBlockUser() {
  const refresh = useRefreshAfterBlock();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`/users/${userId}/block`, {}, blockPublicSchema),
    onSuccess: refresh,
  });
}

export function useUnblockUser() {
  const refresh = useRefreshAfterBlock();
  return useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/users/${userId}/block`, z.undefined()),
    onSuccess: refresh,
  });
}
