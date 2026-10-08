import { sanctionPublicSchema } from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";

export const sanctionKeys = { mine: () => ["sanctions", "mine"] as const };

export function useMySanctions() {
  return useQuery({
    queryKey: sanctionKeys.mine(),
    queryFn: () => apiClient.get("/sanctions/me", z.array(sanctionPublicSchema)),
  });
}

/** SPEC §6.3: a sanction can be appealed once. */
export function useAppealSanction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sanctionId, reason }: { sanctionId: string; reason: string }) =>
      apiClient.post(`/sanctions/${sanctionId}/appeal`, { reason }, sanctionPublicSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sanctionKeys.mine() }),
  });
}
