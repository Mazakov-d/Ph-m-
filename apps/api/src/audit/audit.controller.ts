import { Controller, Get, Query } from "@nestjs/common";
import {
  type AuditLogModeration,
  type CursorQuery,
  cursorQuerySchema,
  type Paginated,
} from "@fama/shared";
import { RequirePermission } from "../common/decorators/require-permission.decorator.js";
import { decodeCursor, toPage } from "../common/pagination/cursor.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** SPEC §2.4: the audit log, newest first, for admins. */
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission("audit.read")
  async list(
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<Paginated<AuditLogModeration>> {
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.auditLog.findMany({
      where: after
        ? {
            OR: [
              { createdAt: { lt: after.createdAt } },
              { createdAt: after.createdAt, id: { lt: after.id } },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      include: { actor: { select: { pseudo: true } } },
    });
    const page = toPage(rows, query.limit, (row) => row);
    return {
      items: page.rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorPseudo: row.actor.pseudo,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: isRecord(row.metadata) ? row.metadata : null,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
