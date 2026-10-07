import { describe, expect, it } from "vitest";
import { createCommentReportInputSchema, createPostReportInputSchema } from "./report.js";

describe("report inputs (SPEC §5.1, §6.2)", () => {
  it("accepts a reason without details", () => {
    expect(
      createPostReportInputSchema.safeParse({ reason: "DUBIOUS_SOURCE", details: null }).success,
    ).toBe(true);
  });

  it("requires details for OTHER", () => {
    expect(createPostReportInputSchema.safeParse({ reason: "OTHER", details: null }).success).toBe(
      false,
    );
    expect(
      createCommentReportInputSchema.safeParse({ reason: "OTHER", details: null }).success,
    ).toBe(false);
    expect(
      createCommentReportInputSchema.safeParse({ reason: "OTHER", details: "Publicité déguisée" })
        .success,
    ).toBe(true);
  });

  it("does not mix post and comment reasons", () => {
    expect(createPostReportInputSchema.safeParse({ reason: "INSULT", details: null }).success).toBe(
      false,
    );
    expect(
      createCommentReportInputSchema.safeParse({ reason: "DUBIOUS_SOURCE", details: null }).success,
    ).toBe(false);
  });
});
