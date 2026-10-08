import {
  auditLogModerationSchema,
  type OpenSupportTicketInput,
  editorChatModerationSchema,
  type MessagePublic,
  messagePublicSchema,
  paginated,
  ticketModerationSchema,
  ticketPublicSchema,
} from "@fama/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { followConversation } from "../../lib/realtime";

const FIRST_PAGE: string | null = null;

export const ticketKeys = {
  all: ["tickets"] as const,
  mine: () => [...ticketKeys.all, "mine"] as const,
  moderator: (scope: "unassigned" | "mine") => [...ticketKeys.all, "moderator", scope] as const,
  admin: () => [...ticketKeys.all, "admin"] as const,
  messages: (ticketId: string) => [...ticketKeys.all, "messages", ticketId] as const,
  editorChat: (editorId: string) => [...ticketKeys.all, "editor-chat", editorId] as const,
  audit: () => ["audit-logs"] as const,
};

function useRefreshTickets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ticketKeys.all });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ticketKeys.mine(),
    queryFn: () => apiClient.get("/tickets/mine", z.array(ticketPublicSchema)),
  });
}

export function useOpenSupportTicket() {
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: (input: OpenSupportTicketInput) =>
      apiClient.post("/tickets", input, ticketPublicSchema),
    onSuccess: refresh,
  });
}

/**
 * SPEC §8: the conversation. docs/DECISIONS.md (real-time conversations): new messages arrive
 * through the WebSocket as soon as they are sent; after a cut, the conversation is read again.
 */
export function useMessages(ticketId: string) {
  const queryClient = useQueryClient();
  const queryKey = ticketKeys.messages(ticketId);

  // Following the conversation on the WebSocket: an external system, kept in sync with the screen.
  useEffect(
    () =>
      followConversation(ticketId, {
        onMessage: (message) =>
          queryClient.setQueryData<MessagePublic[]>(ticketKeys.messages(ticketId), (current) =>
            current && !current.some((known) => known.id === message.id)
              ? [...current, message]
              : current,
          ),
        onReconnect: () =>
          void queryClient.invalidateQueries({ queryKey: ticketKeys.messages(ticketId) }),
      }),
    [ticketId, queryClient],
  );

  return useQuery({
    queryKey,
    queryFn: () => apiClient.get(`/tickets/${ticketId}/messages`, z.array(messagePublicSchema)),
  });
}

export function useSendMessage(ticketId: string) {
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/tickets/${ticketId}/messages`, { content }, messagePublicSchema),
    onSuccess: refresh,
  });
}

export function useModeratorTickets(scope: "unassigned" | "mine") {
  return useQuery({
    queryKey: ticketKeys.moderator(scope),
    queryFn: () =>
      apiClient.get(`/moderation/tickets?scope=${scope}`, z.array(ticketModerationSchema)),
  });
}

export function useTicketAction(action: "assign" | "close") {
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: (ticketId: string) =>
      apiClient.post(`/moderation/tickets/${ticketId}/${action}`, {}, ticketModerationSchema),
    onSuccess: refresh,
  });
}

/** SPEC §8: a moderator opens a chat with an editor. */
export function useOpenEditorChat() {
  const refresh = useRefreshTickets();
  return useMutation({
    mutationFn: ({ editorId, content }: { editorId: string; content: string }) =>
      apiClient.post("/moderation/editor-chats", { editorId, content }, ticketModerationSchema),
    onSuccess: refresh,
  });
}

/** docs/DECISIONS.md (chats): the open chat with an editor shown on the editor's page. */
export function useEditorChat(editorId: string, enabled: boolean) {
  return useQuery({
    queryKey: ticketKeys.editorChat(editorId),
    queryFn: () =>
      apiClient.get(`/moderation/editors/${editorId}/chat`, editorChatModerationSchema),
    enabled,
  });
}

export function useAllTickets() {
  return useQuery({
    queryKey: ticketKeys.admin(),
    queryFn: () => apiClient.get("/admin/tickets", z.array(ticketModerationSchema)),
  });
}

/** SPEC §2.4: the audit log, newest first, page by page. */
export function useAuditLogs() {
  return useInfiniteQuery({
    queryKey: ticketKeys.audit(),
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }) =>
      apiClient.get(
        `/admin/audit-logs${pageParam ? `?cursor=${pageParam}` : ""}`,
        paginated(auditLogModerationSchema),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
