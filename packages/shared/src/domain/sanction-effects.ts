import type { SanctionType } from "../enums.js";
import { SANCTION_RESET_MONTHS, SUSPENSION_24H_HOURS, SUSPENSION_7D_HOURS } from "../rules.js";
import { MILLISECONDS_PER_HOUR } from "./time.js";

const SUSPENSION_HOURS: Partial<Record<SanctionType, number>> = {
  SUSPENSION_24H: SUSPENSION_24H_HOURS,
  SUSPENSION_7D: SUSPENSION_7D_HOURS,
};

/** SPEC §6.3: end of a suspension starting `now`; null for a warning or a permanent ban. */
export function suspensionEndsAt(type: SanctionType, now: Date): Date | null {
  const hours = SUSPENSION_HOURS[type];
  return hours === undefined ? null : new Date(now.getTime() + hours * MILLISECONDS_PER_HOUR);
}

/** SPEC §6.3: start of the period over which removed contents count (6 months before `now`). */
export function sanctionCountingStart(now: Date): Date {
  const start = new Date(now);
  start.setMonth(start.getMonth() - SANCTION_RESET_MONTHS);
  return start;
}
