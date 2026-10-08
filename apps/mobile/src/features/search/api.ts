import { SEARCH_QUERY_MIN_LENGTH, searchResultsPublicSchema } from "@fama/shared";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { type FeedFilters, setPlaceParams } from "../posts/api";

export const searchKeys = {
  all: ["search"] as const,
  results: (q: string, filters: FeedFilters) => [...searchKeys.all, q, filters] as const,
};

/** True when the text is long enough to search (SPEC §4.4). */
export const isSearchActive = (q: string) => q.trim().length >= SEARCH_QUERY_MIN_LENGTH;

/** SPEC §4.4: editors and posts matching the text, with the feed's filters. */
export function useSearch(q: string, filters: FeedFilters) {
  const text = q.trim();
  return useQuery({
    queryKey: searchKeys.results(text, filters),
    enabled: isSearchActive(text),
    queryFn: () => {
      const params = new URLSearchParams({ q: text });
      if (filters.today) params.set("today", "true");
      setPlaceParams(params, filters.place);
      if (filters.theme) params.set("theme", filters.theme);
      return apiClient.get(`/search?${params}`, searchResultsPublicSchema);
    },
  });
}
