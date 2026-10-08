import { z } from "zod";
import { Locality, Theme, Zone } from "../enums.js";
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from "../rules.js";
import { editorSummaryPublicSchema } from "./editor.js";
import { postSummaryPublicSchema } from "./post.js";

// SPEC §4.4: one search bar (editors' pseudos, titles, content), combinable with the filters.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_QUERY_MIN_LENGTH).max(SEARCH_QUERY_MAX_LENGTH),
  today: z.stringbool().default(false),
  zone: Zone.optional(),
  locality: Locality.optional(),
  theme: Theme.optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** SPEC §4.4: results split between editors and posts. */
export const searchResultsPublicSchema = z.object({
  editors: z.array(editorSummaryPublicSchema),
  posts: z.array(postSummaryPublicSchema),
});
export type SearchResultsPublic = z.infer<typeof searchResultsPublicSchema>;
