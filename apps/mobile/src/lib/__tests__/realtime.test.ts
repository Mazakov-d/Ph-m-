import { REALTIME_UNAUTHENTICATED_CLOSE_CODE } from "@fama/shared";
import { apiClient } from "../apiClient";
import { followConversation } from "../realtime";

const TICKET = "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const message = {
  id: "1b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  ticketId: TICKET,
  authorPseudo: "modo",
  fromTeam: true,
  authorRole: "MODERATOR",
  content: "Nous regardons.",
  createdAt: new Date().toISOString(),
};

/** A WebSocket the test drives by hand. */
class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
}

describe("followConversation (docs/DECISIONS.md: real-time conversations)", () => {
  const realWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeSocket.instances = [];
    Object.defineProperty(globalThis, "WebSocket", { value: FakeSocket, configurable: true });
    jest.spyOn(apiClient, "realtimeUrl").mockReturnValue("ws://api/ws?token=t");
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "WebSocket", { value: realWebSocket, configurable: true });
    jest.restoreAllMocks();
  });

  it("follows the conversation once connected and passes its messages on", () => {
    const onMessage = jest.fn();
    const stop = followConversation(TICKET, { onMessage, onReconnect: jest.fn() });
    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("No socket");
    socket.open();
    expect(socket.sent).toEqual([{ event: "subscribe", data: { ticketId: TICKET } }]);

    socket.onmessage?.({ data: JSON.stringify({ event: "message", data: message }) });
    expect(onMessage).toHaveBeenCalledWith(message);

    stop();
    expect(socket.sent.at(-1)).toEqual({ event: "unsubscribe", data: { ticketId: TICKET } });
    expect(socket.closed).toBe(true);
  });

  it("reconnects with a fresh token when the API closes for an expired one", async () => {
    const renew = jest.spyOn(apiClient, "renewSession").mockResolvedValue(true);
    const stop = followConversation(TICKET, { onMessage: jest.fn(), onReconnect: jest.fn() });
    const first = FakeSocket.instances[0];
    first?.open();
    first?.onclose?.({ code: REALTIME_UNAUTHENTICATED_CLOSE_CODE });
    await Promise.resolve();
    await Promise.resolve();
    expect(renew).toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(2);
    stop();
  });
});
