import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";
import { type PushMessage, PushSender } from "./push-sender.js";

// Expo push service (https://docs.expo.dev/push-notifications/sending-notifications/).
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
const MESSAGES_PER_REQUEST = 100;

const ticketsSchema = z.object({
  data: z.array(
    z.object({
      status: z.enum(["ok", "error"]),
      details: z.object({ error: z.string().optional() }).optional(),
    }),
  ),
});

/** Sends through Expo, and forgets the tokens of phones that uninstalled the app. */
@Injectable()
export class ExpoPushSender extends PushSender {
  private readonly logger = new Logger(ExpoPushSender.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async send(messages: PushMessage[]): Promise<void> {
    for (let start = 0; start < messages.length; start += MESSAGES_PER_REQUEST) {
      const chunk = messages.slice(start, start + MESSAGES_PER_REQUEST);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          chunk.map((message) => ({
            to: message.to,
            title: message.title,
            body: message.body,
            data: { url: message.url },
            sound: "default",
          })),
        ),
      });
      if (!response.ok) {
        this.logger.warn(`Expo push service answered ${response.status}`);
        continue;
      }
      const tickets = ticketsSchema.safeParse(await response.json());
      if (!tickets.success) continue;
      const unregistered = chunk.filter(
        (_, index) => tickets.data.data[index]?.details?.error === "DeviceNotRegistered",
      );
      if (unregistered.length > 0) {
        await this.prisma.pushToken.deleteMany({
          where: { token: { in: unregistered.map((message) => message.to) } },
        });
      }
    }
  }
}
