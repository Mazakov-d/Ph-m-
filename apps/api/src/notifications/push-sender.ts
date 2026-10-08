/** A push notification for one phone: a title, a text, and the page of the app it opens. */
export type PushMessage = { to: string; title: string; body: string; url: string };

/**
 * Delivers push notifications. The app uses Expo's push service; the tests use a sender that
 * keeps the messages instead (PUSH_DELIVERY=disabled, or an override in a test).
 */
export abstract class PushSender {
  abstract send(messages: PushMessage[]): Promise<void>;
}

/** Sends nothing: notifications are turned off (tests, local development without phones). */
export class DisabledPushSender extends PushSender {
  async send(): Promise<void> {
    // Nothing to deliver.
  }
}
