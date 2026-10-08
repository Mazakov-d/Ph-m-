import {
  type MessagePublic,
  REALTIME_UNAUTHENTICATED_CLOSE_CODE,
  type RealtimeClientMessage,
  realtimeServerMessageSchema,
} from "@fama/shared";
import { apiClient } from "./apiClient";

/**
 * docs/DECISIONS.md (real-time conversations): one WebSocket for the conversations on screen.
 * It opens with the first conversation followed and closes with the last one; it reconnects
 * after a cut (waiting longer each time) and with a fresh token when the API closes it for an
 * expired one. `onReconnect` lets a screen fetch the messages missed meanwhile.
 */
type Follower = { onMessage: (message: MessagePublic) => void; onReconnect: () => void };

const RECONNECT_FIRST_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

const followers = new Map<string, Set<Follower>>();
let socket: WebSocket | null = null;
let reconnectDelay = RECONNECT_FIRST_DELAY_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let hasConnectedBefore = false;

function send(message: RealtimeClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function connect(): void {
  const url = apiClient.realtimeUrl();
  if (!url || followers.size === 0) return;
  const current = new WebSocket(url);
  socket = current;

  current.onopen = () => {
    reconnectDelay = RECONNECT_FIRST_DELAY_MS;
    for (const ticketId of followers.keys()) send({ event: "subscribe", data: { ticketId } });
    if (hasConnectedBefore) {
      for (const set of followers.values()) set.forEach((follower) => follower.onReconnect());
    }
    hasConnectedBefore = true;
  };

  current.onmessage = (event) => {
    const parsed = realtimeServerMessageSchema.safeParse(JSON.parse(String(event.data)));
    if (parsed.success && parsed.data.event === "message") {
      const message = parsed.data.data;
      followers.get(message.ticketId)?.forEach((follower) => follower.onMessage(message));
    }
  };

  current.onclose = (event) => {
    if (socket !== current) return;
    socket = null;
    if (followers.size === 0) return;
    if (event.code === REALTIME_UNAUTHENTICATED_CLOSE_CODE) {
      // The access token expired: a fresh one, then a new connection.
      void apiClient.renewSession().then((renewed) => (renewed ? connect() : undefined));
      return;
    }
    reconnectTimer = setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY_MS);
  };
}

function disconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const current = socket;
  socket = null;
  hasConnectedBefore = false;
  current?.close();
}

/** Follows a conversation; returns the function that stops following it. */
export function followConversation(ticketId: string, follower: Follower): () => void {
  const set = followers.get(ticketId) ?? new Set<Follower>();
  followers.set(ticketId, set);
  set.add(follower);
  if (!socket) connect();
  else send({ event: "subscribe", data: { ticketId } });

  return () => {
    set.delete(follower);
    if (set.size > 0) return;
    followers.delete(ticketId);
    send({ event: "unsubscribe", data: { ticketId } });
    if (followers.size === 0) disconnect();
  };
}
