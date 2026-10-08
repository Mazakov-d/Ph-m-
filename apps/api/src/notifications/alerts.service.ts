import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ALERTS_MAX,
  type AlertPublic,
  type AuthUser,
  type CreateAlertInput,
  type RegisterPushTokenInput,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toAlertPublic } from "./notifications.mapper.js";

/** docs/DECISIONS.md (push notifications): the reader's phones and alerts. */
@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /** A phone belongs to whoever signed in on it last (a shared phone changes hands). */
  async registerPushToken(user: AuthUser, input: RegisterPushTokenInput): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: input.token },
      create: { userId: user.id, token: input.token, platform: input.platform },
      update: { userId: user.id, platform: input.platform },
    });
  }

  /** On sign-out: the phone stops receiving this account's notifications. */
  async unregisterPushToken(user: AuthUser, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  }

  async list(user: AuthUser): Promise<AlertPublic[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return alerts.map(toAlertPublic);
  }

  /** ALERTS_MAX per account, checked and created in one transaction (CLAUDE.md §5.3). */
  async create(user: AuthUser, input: CreateAlertInput): Promise<AlertPublic> {
    return this.prisma.$transaction(async (tx) => {
      // Locks the account row, so that two alerts created at once cannot pass the limit.
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const count = await tx.alert.count({ where: { userId: user.id } });
      if (count >= ALERTS_MAX) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "ALERTS_LIMIT_REACHED",
          `At most ${ALERTS_MAX} alerts`,
        );
      }
      const alert = await tx.alert.create({ data: { userId: user.id, ...input } });
      return toAlertPublic(alert);
    });
  }

  async remove(user: AuthUser, alertId: string): Promise<void> {
    const deleted = await this.prisma.alert.deleteMany({ where: { id: alertId, userId: user.id } });
    if (deleted.count === 0) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such alert");
    }
  }
}
