import {
  type CreateEditorApplicationInput,
  editorApplicationPublicSchema,
  editorPublicSchema,
  type UpdateEditorProfileInput,
} from "@fama/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiRequestError } from "../../lib/apiClient";
import { toFormDataFile } from "../../lib/formDataFile";
import type { PickedDocument } from "./documents";

export const editorKeys = {
  all: ["editors"] as const,
  myApplication: () => [...editorKeys.all, "me", "application"] as const,
  profile: (editorId: string) => [...editorKeys.all, "profile", editorId] as const,
};

/** The signed-in user's application, or null if they never applied. */
export function useMyEditorApplication(enabled: boolean) {
  return useQuery({
    queryKey: editorKeys.myApplication(),
    enabled,
    queryFn: async () => {
      try {
        return await apiClient.get("/editors/me/application", editorApplicationPublicSchema);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "NOT_FOUND") {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useApplyAsEditor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      application,
      documents,
    }: {
      application: CreateEditorApplicationInput;
      documents: PickedDocument[];
    }) => {
      // Files cannot travel in JSON: the other fields go as one JSON field (see the API).
      const form = new FormData();
      form.append("application", JSON.stringify(application));
      documents.forEach((document) => form.append("documents", toFormDataFile(document)));
      return apiClient.postForm("/editors/application", form, editorApplicationPublicSchema);
    },
    onSuccess: (application) => queryClient.setQueryData(editorKeys.myApplication(), application),
  });
}

export function useUpdateEditorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEditorProfileInput) =>
      apiClient.patch("/editors/me", input, editorApplicationPublicSchema),
    onSuccess: (application) => {
      queryClient.setQueryData(editorKeys.myApplication(), application);
      // The public profile shows or hides the identity accordingly.
      return queryClient.invalidateQueries({ queryKey: [...editorKeys.all, "profile"] });
    },
  });
}

export function useEditorProfile(editorId: string) {
  return useQuery({
    queryKey: editorKeys.profile(editorId),
    queryFn: () => apiClient.get(`/editors/${editorId}`, editorPublicSchema),
  });
}
