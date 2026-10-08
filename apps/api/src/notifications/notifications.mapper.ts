import type { AlertPublic } from "@fama/shared";
import type { Alert } from "../generated/prisma/client.js";

export function toAlertPublic(alert: Alert): AlertPublic {
  return {
    id: alert.id,
    theme: alert.theme,
    zone: alert.zone,
    locality: alert.locality,
    createdAt: alert.createdAt.toISOString(),
  };
}
