import type { SanctionPublic } from "@fama/shared";
import type { Appeal, Sanction } from "../generated/prisma/client.js";

export type SanctionRecord = Sanction & { appeal: Appeal | null };

function appealStateOf(appeal: Appeal | null): SanctionPublic["appealState"] {
  if (!appeal) return "NONE";
  if (!appeal.resolvedAt) return "PENDING";
  return appeal.accepted ? "ACCEPTED" : "REJECTED";
}

export function toSanctionPublic(sanction: SanctionRecord): SanctionPublic {
  return {
    id: sanction.id,
    type: sanction.type,
    commentId: sanction.commentId,
    postId: sanction.postId,
    createdAt: sanction.createdAt.toISOString(),
    endsAt: sanction.endsAt?.toISOString() ?? null,
    appealState: appealStateOf(sanction.appeal),
    liftedAt: sanction.liftedAt?.toISOString() ?? null,
  };
}
