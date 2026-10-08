import type { IncomingMessage } from "node:http";
import { type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import {
  type AuthUser,
  idSchema,
  type MessagePublic,
  REALTIME_UNAUTHENTICATED_CLOSE_CODE,
  type RealtimeServerMessage,
} from "@fama/shared";
import type { Subscription } from "rxjs";
import type { WebSocket } from "ws";
import { z } from "zod";
import { AuthService } from "../auth/auth.service.js";
import { ConversationEvents } from "./conversation-events.js";
import { TicketsService } from "./tickets.service.js";

const followSchema = z.object({ ticketId: idSchema });
const OPEN = 1;

type Connection = { user: AuthUser | null; tickets: Set<string>; expiry?: NodeJS.Timeout };

/**
 * docs/DECISIONS.md (real-time conversations): the app follows the conversations it shows and
 * receives their new messages at once, instead of asking every 10 seconds. The access token
 * goes in the address (`/ws?token=…`), checked like an HTTP request; the connection closes when
 * it expires, and the app reconnects with a fresh one.
 */
@WebSocketGateway({ path: "/ws" })
export class ConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  // Authentication is asynchronous: a « subscribe » may arrive before it ends, so it waits.
  private readonly connections = new Map<WebSocket, Promise<Connection>>();
  private subscription?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly tickets: TicketsService,
    private readonly events: ConversationEvents,
  ) {}

  onModuleInit(): void {
    this.subscription = this.events.messages.subscribe((message) => void this.broadcast(message));
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    this.connections.set(client, this.authenticate(client, request));
  }

  async handleDisconnect(client: WebSocket): Promise<void> {
    const connection = await this.connections.get(client);
    clearTimeout(connection?.expiry);
    this.connections.delete(client);
  }

  @SubscribeMessage("subscribe")
  async subscribe(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: unknown,
  ): Promise<RealtimeServerMessage> {
    const follow = followSchema.safeParse(data);
    if (!follow.success) return { event: "error", data: { code: "VALIDATION_ERROR" } };
    const connection = await this.connections.get(client);
    const user = connection?.user;
    // Same rule as reading the messages over HTTP (ADMIN readings audited, SPEC §2.4).
    if (!connection || !user || !(await this.tickets.canFollow(user, follow.data.ticketId))) {
      return { event: "error", data: { code: "NOT_FOUND" } };
    }
    connection.tickets.add(follow.data.ticketId);
    return { event: "subscribed", data: { ticketId: follow.data.ticketId } };
  }

  @SubscribeMessage("unsubscribe")
  async unsubscribe(@ConnectedSocket() client: WebSocket, @MessageBody() data: unknown) {
    const follow = followSchema.safeParse(data);
    const connection = await this.connections.get(client);
    if (follow.success) connection?.tickets.delete(follow.data.ticketId);
  }

  private async authenticate(client: WebSocket, request: IncomingMessage): Promise<Connection> {
    const token = new URL(request.url ?? "/", "http://localhost").searchParams.get("token");
    const session = token ? await this.auth.authenticateAccessToken(token) : null;
    if (!session) {
      client.close(REALTIME_UNAUTHENTICATED_CLOSE_CODE, "Unauthenticated");
      return { user: null, tickets: new Set() };
    }
    const expiry = setTimeout(
      () => client.close(REALTIME_UNAUTHENTICATED_CLOSE_CODE, "Access token expired"),
      Math.max(0, session.expiresAt.getTime() - Date.now()),
    );
    // A pending timer must not keep the process alive (tests, shutdown).
    expiry.unref();
    return { user: session.user, tickets: new Set(), expiry };
  }

  private async broadcast(message: MessagePublic): Promise<void> {
    const event: RealtimeServerMessage = { event: "message", data: message };
    const payload = JSON.stringify(event);
    for (const [client, pending] of this.connections) {
      const connection = await pending;
      if (connection.tickets.has(message.ticketId) && client.readyState === OPEN) {
        client.send(payload);
      }
    }
  }
}
