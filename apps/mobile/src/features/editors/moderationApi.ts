import {
  type EditorDecisionInput,
  editorModerationSchema,
  type EditorStatus,
  paginated,
} from "@fama/shared";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { apiClient } from "../../lib/apiClient";
import { editorKeys } from "./api";

const editorApplicationsPageSchema = paginated(editorModerationSchema);
// The first page has no cursor.
const FIRST_PAGE: string | null = null;

export const editorApplicationKeys = {
  all: [...editorKeys.all, "applications"] as const,
  byStatus: (status: EditorStatus) => [...editorApplicationKeys.all, status] as const,
};

/** SPEC §2.2: applications to review, oldest first, loaded page by page. */
export function useEditorApplications(status: EditorStatus) {
  return useInfiniteQuery({
    queryKey: editorApplicationKeys.byStatus(status),
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ status });
      if (pageParam) {
        params.set("cursor", pageParam);
      }
      return apiClient.get(
        `/moderation/editor-applications?${params}`,
        editorApplicationsPageSchema,
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useDecideEditorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, decision }: { userId: string; decision: EditorDecisionInput }) =>
      apiClient.post(
        `/moderation/editor-applications/${userId}/decision`,
        decision,
        editorModerationSchema,
      ),
    // The application leaves its list and may appear in another one (e.g. INDEPENDENT).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: editorApplicationKeys.all }),
  });
}

/** Documents can be opened from the web version only (docs/DECISIONS.md: no public URL). */
export const CAN_OPEN_DOCUMENTS = Platform.OS === "web";

/** Downloads an identity document with the moderator's session and opens it in a new tab. */
export async function openIdentityDocument(userId: string, index: number): Promise<void> {
  const blob = await apiClient.getBlob(
    `/moderation/editor-applications/${userId}/documents/${index}`,
  );
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
}
