import {
  type AlertPublic,
  alertPublicSchema,
  type CreateAlertInput,
  type PushPlatform,
} from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { currentPushToken, forgetPushToken } from "../../lib/pushNotifications";

export const alertKeys = { all: ["alerts"] as const };

export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.all,
    queryFn: () => apiClient.get("/alerts", z.array(alertPublicSchema)),
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput): Promise<AlertPublic> =>
      apiClient.post("/alerts", input, alertPublicSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertKeys.all }),
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => apiClient.delete(`/alerts/${alertId}`, z.undefined()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertKeys.all }),
  });
}

/** Ties this phone to the signed-in account (docs/DECISIONS.md: push notifications). */
export function registerPushToken(token: string, platform: PushPlatform): Promise<undefined> {
  return apiClient.post("/notifications/push-tokens", { token, platform }, z.undefined());
}

/** Before signing out: this phone stops receiving the account's notifications. */
export async function unregisterThisPhone(): Promise<void> {
  const token = currentPushToken();
  if (!token) return;
  await apiClient.post("/notifications/push-tokens/unregister", { token }, z.undefined());
  forgetPushToken();
}
