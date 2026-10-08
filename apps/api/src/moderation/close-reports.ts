import type { Prisma } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient;
type Outcome = "UPHELD" | "DISMISSED";

/** SPEC §5.5 and §6.2: the reporters' history feeds the weight of their next reports (§5.2). */
async function creditReporters(tx: Tx, reporterIds: string[], outcome: Outcome): Promise<void> {
  await tx.user.updateMany({
    where: { id: { in: reporterIds } },
    data:
      outcome === "UPHELD"
        ? { upheldReportCount: { increment: 1 } }
        : { dismissedReportCount: { increment: 1 } },
  });
}

/** Closes the pending reports of a comment and credits their authors. */
export async function closeCommentReports(
  tx: Tx,
  commentId: string,
  outcome: Outcome,
): Promise<void> {
  const pending = await tx.commentReport.findMany({ where: { commentId, status: "PENDING" } });
  await tx.commentReport.updateMany({
    where: { commentId, status: "PENDING" },
    data: { status: outcome },
  });
  await creditReporters(
    tx,
    pending.map((report) => report.reporterId),
    outcome,
  );
}

/** Closes the pending reports of a post and credits their authors. */
export async function closePostReports(tx: Tx, postId: string, outcome: Outcome): Promise<void> {
  const pending = await tx.postReport.findMany({ where: { postId, status: "PENDING" } });
  await tx.postReport.updateMany({
    where: { postId, status: "PENDING" },
    data: { status: outcome },
  });
  await creditReporters(
    tx,
    pending.map((report) => report.reporterId),
    outcome,
  );
}
