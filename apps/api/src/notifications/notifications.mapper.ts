import type { AlertPublic } from "@fama/shared";
import type { Alert } from "../generated/prisma/client.js";

export function toAlertPublic(alert: Alert): AlertPublic {
  return {
    id: alert.id,
    theme: alert.theme,
    zone: alert.zone,
    region: alert.region,
    createdAt: alert.createdAt.toISOString(),
  };
}
