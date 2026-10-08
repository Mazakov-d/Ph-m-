import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TICKET_ASSIGN_TIMEOUT_HOURS } from "@fama/shared";
import { PrismaService } from "../prisma/prisma.service.js";

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

/** SPEC §8: an assigned ticket goes back to NEW after 24 h without a message of its moderator. */
@Injectable()
export class TicketTimeoutJob {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(now: Date = new Date()): Promise<number> {
    const limit = new Date(now.getTime() - TICKET_ASSIGN_TIMEOUT_HOURS * MILLISECONDS_PER_HOUR);
    const released = await this.prisma.ticket.updateMany({
      where: {
        status: "ASSIGNED",
        // The moderator's last message, or the assignment when they never wrote.
        OR: [
          { lastModeratorMessageAt: { lte: limit } },
          { lastModeratorMessageAt: null, assignedAt: { lte: limit } },
        ],
      },
      data: {
        status: "NEW",
        assignedModeratorId: null,
        assignedAt: null,
        lastModeratorMessageAt: null,
      },
    });
    return released.count;
  }
}
