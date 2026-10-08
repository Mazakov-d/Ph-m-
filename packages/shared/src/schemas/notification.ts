import { z } from "zod";
import { PushPlatform, Theme, Zone } from "../enums.js";
import { PUSH_TOKEN_MAX_LENGTH, REGION_MAX_LENGTH } from "../rules.js";
import { idSchema, isoDateTimeSchema } from "./common.js";

// docs/DECISIONS.md: the Expo push token of a phone, sent after the reader allowed notifications.
export const registerPushTokenInputSchema = z.object({
  token: z.string().trim().min(1).max(PUSH_TOKEN_MAX_LENGTH),
  platform: PushPlatform,
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenInputSchema>;

export const unregisterPushTokenInputSchema = registerPushTokenInputSchema.pick({ token: true });
export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenInputSchema>;

/**
 * docs/DECISIONS.md (push notifications): an alert on new posts — a theme, a zone, or both
 * (« sport en France »); a region only narrows a LOCAL zone.
 */
export const createAlertInputSchema = z
  .object({
    theme: Theme.nullable(),
    zone: Zone.nullable(),
    region: z.string().trim().min(1).max(REGION_MAX_LENGTH).nullable(),
  })
  .refine((alert) => alert.theme !== null || alert.zone !== null, {
    path: ["theme"],
    message: "An alert needs a theme or a zone",
  })
  .refine((alert) => alert.region === null || alert.zone === "LOCAL", {
    path: ["region"],
    message: "A region only goes with the LOCAL zone",
  });
export type CreateAlertInput = z.infer<typeof createAlertInputSchema>;

export const alertPublicSchema = z.object({
  id: idSchema,
  theme: Theme.nullable(),
  zone: Zone.nullable(),
  region: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type AlertPublic = z.infer<typeof alertPublicSchema>;
