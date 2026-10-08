import { Injectable } from "@nestjs/common";
import type { MessagePublic } from "@fama/shared";
import { Subject } from "rxjs";

/**
 * docs/DECISIONS.md (real-time conversations): the new messages, from TicketsService to the
 * WebSocket gateway. In memory: enough for one instance of the API (several instances would
 * share them through Redis).
 */
@Injectable()
export class ConversationEvents {
  readonly messages = new Subject<MessagePublic>();

  publish(message: MessagePublic): void {
    this.messages.next(message);
  }
}
