import { describe, expect, it } from "vitest";
import { commentDecisionInputSchema, commentPublicSchema } from "./comment.js";
import { createReviewInputSchema } from "./review.js";
import { createTicketInputSchema } from "./ticket.js";
import { voteSummaryPublicSchema } from "./vote.js";

describe("commentPublicSchema (SPEC §6)", () => {
  it("allows a null content for a hidden or deleted comment", () => {
    const comment = {
      id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      postId: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a12",
      parentId: null,
      authorId: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a13",
      authorPseudo: "lea",
      content: null,
      status: "DELETED",
      createdAt: "2026-10-07T12:00:00.000Z",
    };
    expect(commentPublicSchema.safeParse(comment).success).toBe(true);
  });

  it("rejects a Date object instead of an ISO string", () => {
    expect(
      commentPublicSchema.shape.createdAt.safeParse(new Date("2026-10-07T12:00:00.000Z")).success,
    ).toBe(false);
  });
});

describe("commentDecisionInputSchema (SPEC §6.2)", () => {
  it("requires the discrimination and PHAROS answers to remove a comment", () => {
    expect(commentDecisionInputSchema.safeParse({ decision: "REMOVED" }).success).toBe(false);
    expect(
      commentDecisionInputSchema.safeParse({
        decision: "REMOVED",
        isDiscrimination: false,
        reportToPharos: false,
      }).success,
    ).toBe(true);
  });
});

describe("createReviewInputSchema (SPEC §5.5)", () => {
  it("requires a public note and at least one source", () => {
    expect(
      createReviewInputSchema.safeParse({ verdict: "FALSE", publicNote: "", sources: ["x"] })
        .success,
    ).toBe(false);
    expect(
      createReviewInputSchema.safeParse({ verdict: "FALSE", publicNote: "Note", sources: [] })
        .success,
    ).toBe(false);
  });
});

describe("createTicketInputSchema (SPEC §8)", () => {
  it("requires the editor for an EDITOR_CHAT", () => {
    expect(
      createTicketInputSchema.safeParse({ kind: "EDITOR_CHAT", content: "Bonjour" }).success,
    ).toBe(false);
    expect(createTicketInputSchema.safeParse({ kind: "SUPPORT", content: "Bonjour" }).success).toBe(
      true,
    );
  });
});

describe("voteSummaryPublicSchema (SPEC §7)", () => {
  it("allows hidden results", () => {
    expect(
      voteSummaryPublicSchema.safeParse({
        options: [{ id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", label: "D'accord" }],
        myOptionId: null,
        revealedResults: false,
        results: null,
      }).success,
    ).toBe(true);
  });
});
