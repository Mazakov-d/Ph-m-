import type { PrismaService } from "../../prisma/prisma.service.js";

/**
 * SPEC §2.3: the editors a moderator declared a conflict of interest with, plus themselves:
 * a moderator never handles a file that concerns them.
 */
export async function excludedAuthorIds(
  prisma: PrismaService,
  moderatorId: string,
): Promise<string[]> {
  const moderator = await prisma.user.findUniqueOrThrow({
    where: { id: moderatorId },
    select: { conflictEditorIds: true },
  });
  return [moderatorId, ...moderator.conflictEditorIds];
}
