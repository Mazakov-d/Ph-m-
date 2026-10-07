import { describe, expect, it } from "vitest";
import { apiErrorSchema } from "./errors.js";

describe("apiErrorSchema", () => {
  it("accepts the { code, message } format", () => {
    expect(
      apiErrorSchema.safeParse({ code: "COMMENT_UNDER_REVIEW", message: "Commentaire en revue" })
        .success,
    ).toBe(true);
  });

  it("accepts validation issues", () => {
    expect(
      apiErrorSchema.safeParse({
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        issues: [{ path: ["sources", 0], message: "Too small" }],
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown code", () => {
    expect(apiErrorSchema.safeParse({ code: "OOPS", message: "?" }).success).toBe(false);
  });
});
