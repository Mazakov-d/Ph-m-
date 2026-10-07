import { HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { ApiException } from "../errors/api.exception.js";

/** Position of the last item of a page (SPEC §4.1: createdAt + id, never a page number). */
export type CursorPosition = { createdAt: Date; id: string };

const cursorPayloadSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });

/** Opaque string handed to the client; it only has to send it back. */
export function encodeCursor(position: CursorPosition): string {
  const payload = { createdAt: position.createdAt.toISOString(), id: position.id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPosition {
  try {
    const payload = cursorPayloadSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString()),
    );
    return { createdAt: new Date(payload.createdAt), id: payload.id };
  } catch {
    throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid cursor");
  }
}

/**
 * Splits `limit + 1` fetched rows into a page and the cursor of the next one
 * (fetching one extra row tells whether another page exists).
 */
export function toPage<Row>(
  rows: Row[],
  limit: number,
  positionOf: (row: Row) => CursorPosition,
): { rows: Row[]; nextCursor: string | null } {
  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  const hasMore = rows.length > limit;
  return { rows: pageRows, nextCursor: hasMore && last ? encodeCursor(positionOf(last)) : null };
}
