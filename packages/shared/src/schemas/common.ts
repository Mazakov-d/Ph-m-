import { z } from "zod";
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, SOURCE_MAX_LENGTH } from "../rules.js";

export const idSchema = z.uuid();

// CLAUDE.md §4.3: dates cross the network as ISO 8601 strings, never as Date objects.
export const isoDateTimeSchema = z.iso.datetime();

// SPEC §4.1: cursor pagination (createdAt + id, encoded by the API), never page numbers.
// `limit` comes from the query string, hence the coercion.
export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

/** A page of items; `nextCursor` is null on the last page. */
export function paginated<Item extends z.ZodType>(itemSchema: Item) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });
}
// Generic counterpart of paginated(), which z.infer cannot express for any item type.
export type Paginated<Item> = { items: Item[]; nextCursor: string | null };

// SPEC §3 and §5.5: a source is a URL or a free-text reference.
export const sourceSchema = z.string().trim().min(1).max(SOURCE_MAX_LENGTH);
