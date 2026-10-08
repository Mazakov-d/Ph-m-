import { HttpStatus } from "@nestjs/common";
import { FEED_SEED_MAX_LENGTH } from "@fama/shared";
import { z } from "zod";
import { ApiException } from "../errors/api.exception.js";

/**
 * Position in a weighted feed (SPEC §4.2): the reader's draw (`seed`), the moment of the first
 * page (`asOf`, so that later posts do not shift the pages) and the number of posts already sent.
 */
export type WeightedCursor = { seed: string; asOf: Date; offset: number };

const payloadSchema = z.object({
  seed: z.string().min(1).max(FEED_SEED_MAX_LENGTH),
  asOf: z.iso.datetime(),
  offset: z.number().int().nonnegative(),
});

export function encodeWeightedCursor(cursor: WeightedCursor): string {
  const payload = { seed: cursor.seed, asOf: cursor.asOf.toISOString(), offset: cursor.offset };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeWeightedCursor(cursor: string): WeightedCursor {
  try {
    const payload = payloadSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString()));
    return { seed: payload.seed, asOf: new Date(payload.asOf), offset: payload.offset };
  } catch {
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid cursor");
  }
}
