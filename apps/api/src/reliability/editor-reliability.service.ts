import { Injectable } from "@nestjs/common";
import {
  type EditorReliabilityLevel,
  editorReliabilityLevel,
  reliabilityWindowStart,
} from "@fama/shared";
import { PrismaService } from "../prisma/prisma.service.js";

/** SPEC §5.7: the reliability gauge of an editor account, computed from the verdicts. */
@Injectable()
export class EditorReliabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async levelFor(editorId: string, now: Date = new Date()): Promise<EditorReliabilityLevel> {
    const reviews = await this.prisma.review.findMany({
      where: { post: { authorId: editorId }, createdAt: { gte: reliabilityWindowStart(now) } },
      orderBy: { createdAt: "desc" },
      select: {
        postId: true,
        verdict: true,
        createdAt: true,
        post: {
          select: {
            corrections: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
          },
        },
      },
    });
    // An article counts once, with its latest verdict (a verdict on appeal replaces the first one).
    const latestByPost = new Map<string, (typeof reviews)[number]>();
    for (const review of reviews) {
      if (!latestByPost.has(review.postId)) latestByPost.set(review.postId, review);
    }
    const verdicts = [...latestByPost.values()].map((review) => {
      const firstCorrection = review.post.corrections[0]?.createdAt;
      return {
        verdict: review.verdict,
        decidedAt: review.createdAt,
        correctedBefore: firstCorrection !== undefined && firstCorrection < review.createdAt,
      };
    });
    return editorReliabilityLevel(verdicts, now);
  }
}
