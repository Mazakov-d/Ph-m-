import {
  type CreatePostInput,
  type FeedSort,
  paginated,
  postPublicSchema,
  postSummaryPublicSchema,
  type Theme,
  type Zone,
} from "@fama/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { type LocalFile, toFormDataFile } from "../../lib/formDataFile";

const postsPageSchema = paginated(postSummaryPublicSchema);
// The first page has no cursor.
const FIRST_PAGE: string | null = null;

export type FeedFilters = {
  today: boolean;
  zone: Zone | null;
  theme: Theme | null;
  /** docs/DECISIONS.md (SPEC §4.2): newest first, or the weighted « À la une » draw. */
  sort: FeedSort;
};

export const NO_FILTERS: FeedFilters = { today: false, zone: null, theme: null, sort: "RECENT" };

export const postKeys = {
  all: ["posts"] as const,
  feed: (filters: FeedFilters, seed: string) => [...postKeys.all, "feed", filters, seed] as const,
  detail: (postId: string) => [...postKeys.all, "detail", postId] as const,
  byEditor: (editorId: string) => [...postKeys.all, "editor", editorId] as const,
};

/**
 * SPEC §4: the feed, loaded page by page (infinite scroll). `seed` is the reader's draw of the
 * « À la une » feed: the same seed keeps the same order; the next pages carry it in their cursor.
 */
export function useFeed(filters: FeedFilters, seed: string) {
  const weighted = filters.sort === "WEIGHTED";
  return useInfiniteQuery({
    // The chronological feed does not depend on the draw.
    queryKey: postKeys.feed(filters, weighted ? seed : ""),
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.today) params.set("today", "true");
      if (filters.zone) params.set("zone", filters.zone);
      if (filters.theme) params.set("theme", filters.theme);
      if (weighted) params.set("sort", "WEIGHTED");
      if (pageParam) params.set("cursor", pageParam);
      else if (weighted) params.set("seed", seed);
      return apiClient.get(`/posts?${params}`, postsPageSchema);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: () => apiClient.get(`/posts/${postId}`, postPublicSchema),
  });
}

/** SPEC §2.2: the publications listed on an editor's public profile. */
export function useEditorPosts(editorId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.byEditor(editorId),
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return apiClient.get(`/editors/${editorId}/posts?${params}`, postsPageSchema);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ post, images }: { post: CreatePostInput; images: LocalFile[] }) => {
      // Images travel with the post (it cannot be modified afterwards): multipart request.
      const form = new FormData();
      form.append("post", JSON.stringify(post));
      images.forEach((image) => form.append("images", toFormDataFile(image)));
      return apiClient.postForm("/posts", form, postPublicSchema);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}
