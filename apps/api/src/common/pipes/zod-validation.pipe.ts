import { HttpStatus, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ApiException } from "../errors/api.exception.js";

/** Validates a @Body, @Query or @Param with a schema from `shared` (CLAUDE.md §5.2). */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        // Zod paths may contain symbols, which JSON cannot carry.
        path: issue.path.map((key) => (typeof key === "symbol" ? String(key) : key)),
        message: issue.message,
      }));
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid input", issues);
    }
    return result.data;
  }
}
