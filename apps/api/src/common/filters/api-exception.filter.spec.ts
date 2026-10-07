import { type ArgumentsHost, HttpStatus, NotFoundException } from "@nestjs/common";
import { ApiException } from "../errors/api.exception.js";
import { ApiExceptionFilter } from "./api-exception.filter.js";

function captureResponse(exception: unknown): { status: number; body: unknown } {
  const captured: { status: number; body: unknown } = { status: 0, body: undefined };
  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost; // Test double: only switchToHttp().getResponse() is used.
  new ApiExceptionFilter().catch(exception, host);
  return captured;
}

describe("ApiExceptionFilter", () => {
  it("keeps the body of an ApiException", () => {
    expect(
      captureResponse(new ApiException(HttpStatus.CONFLICT, "PSEUDO_TAKEN", "Pseudo taken")),
    ).toEqual({ status: 409, body: { code: "PSEUDO_TAKEN", message: "Pseudo taken" } });
  });

  it("maps NestJS errors to a code", () => {
    expect(captureResponse(new NotFoundException("Cannot GET /nope"))).toEqual({
      status: 404,
      body: { code: "NOT_FOUND", message: "Cannot GET /nope" },
    });
  });

  it("hides unexpected errors behind INTERNAL_ERROR", () => {
    expect(captureResponse(new Error("database password is hunter2"))).toEqual({
      status: 500,
      body: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });
});
