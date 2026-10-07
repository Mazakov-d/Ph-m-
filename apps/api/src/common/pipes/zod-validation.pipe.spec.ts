import { createCommentInputSchema } from "@fama/shared";
import { ApiException } from "../errors/api.exception.js";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(createCommentInputSchema);
  const validInput = {
    postId: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    parentId: null,
    content: "  Bonjour  ",
  };

  it("returns the parsed value", () => {
    expect(pipe.transform(validInput)).toEqual({ ...validInput, content: "Bonjour" });
  });

  it("throws a VALIDATION_ERROR listing the invalid fields", () => {
    try {
      pipe.transform({ ...validInput, content: "" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      if (error instanceof ApiException) {
        expect(error.getStatus()).toBe(400);
        expect(error.getResponse()).toMatchObject({
          code: "VALIDATION_ERROR",
          issues: [{ path: ["content"] }],
        });
      }
    }
  });
});
