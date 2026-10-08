import {
  juryAssignmentPublicSchema,
  type JuryVoteInput,
  juryVolunteerPublicSchema,
} from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";

export const juryKeys = {
  all: ["jury"] as const,
  volunteer: () => [...juryKeys.all, "volunteer"] as const,
  assignments: () => [...juryKeys.all, "assignments"] as const,
};

/** SPEC §5.8: whether the reader volunteers to sit on juries. */
export function useJuryVolunteer(enabled: boolean) {
  return useQuery({
    queryKey: juryKeys.volunteer(),
    queryFn: () => apiClient.get("/jury/volunteer", juryVolunteerPublicSchema),
    enabled,
  });
}

export function useSetJuryVolunteer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (volunteer: boolean) =>
      apiClient.put("/jury/volunteer", { volunteer }, juryVolunteerPublicSchema),
    onSuccess: (data) => queryClient.setQueryData(juryKeys.volunteer(), data),
  });
}

/** The reader's seats on juries (to vote first). */
export function useJuryAssignments(enabled = true) {
  return useQuery({
    queryKey: juryKeys.assignments(),
    queryFn: () => apiClient.get("/jury/assignments", z.array(juryAssignmentPublicSchema)),
    enabled,
  });
}

export function useJuryVote(seatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JuryVoteInput) =>
      apiClient.post(`/jury/assignments/${seatId}/vote`, input, z.undefined()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: juryKeys.assignments() }),
  });
}
