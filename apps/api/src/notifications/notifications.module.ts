import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { AlertsService } from "./alerts.service.js";
import { ExpoPushSender } from "./expo-push-sender.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { DisabledPushSender, PushSender } from "./push-sender.js";

/** docs/DECISIONS.md (push notifications). PUSH_DELIVERY=disabled sends nothing (tests). */
@Module({
  controllers: [NotificationsController],
  providers: [
    AlertsService,
    NotificationsService,
    {
      provide: PushSender,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        process.env.PUSH_DELIVERY === "disabled"
          ? new DisabledPushSender()
          : new ExpoPushSender(prisma),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
