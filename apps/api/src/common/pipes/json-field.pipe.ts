import { HttpStatus, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ApiException } from "../errors/api.exception.js";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

/**
 * Validates a multipart form field that carries JSON (a file upload cannot send a JSON body,
 * so the other fields travel as one JSON string).
 */
export class JsonFieldValidationPipe<T> implements PipeTransform<unknown, T> {
  private readonly zodPipe: ZodValidationPipe<T>;

  constructor(schema: ZodType<T>) {
    this.zodPipe = new ZodValidationPipe(schema);
  }

  transform(value: unknown): T {
    if (typeof value !== "string") {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Missing JSON field");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Malformed JSON field");
    }
    return this.zodPipe.transform(parsed);
  }
}
