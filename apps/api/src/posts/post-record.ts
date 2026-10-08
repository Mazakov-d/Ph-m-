import type { Prisma } from "../generated/prisma/client.js";

// SPEC §6 + docs/DECISIONS.md: the counter shows the comments displayed to everyone.
const DISPLAYED_COMMENT_STATUSES = ["VISIBLE", "VERIFIED"] as const;

/** What the mapper needs to build a post card or a full post. */
export const POST_INCLUDE = {
  author: { select: { id: true, pseudo: true, editorProfile: { select: { status: true } } } },
  images: { orderBy: { position: "asc" } },
  sources: { orderBy: { position: "asc" } },
  corrections: { orderBy: { createdAt: "asc" } },
  // SPEC §7: answer choices of an opinion, in the editor's order.
  voteOptions: { orderBy: { position: "asc" } },
  // SPEC §5.6: the bar shows the verdict of the latest review.
  reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { verdict: true } },
  _count: {
    select: {
      reports: true,
      // docs/DECISIONS.md: the replies to a comment deleted by its author are not shown.
      comments: {
        where: {
          status: { in: [...DISPLAYED_COMMENT_STATUSES] },
          OR: [{ parentId: null }, { parent: { status: { not: "DELETED" } } }],
        },
      },
    },
  },
} satisfies Prisma.PostInclude;

export type PostRecord = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;
