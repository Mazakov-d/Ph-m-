import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { apiErrorSchema, type ApiError, type ErrorCode } from "@fama/shared";
import type { Response } from "express";

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHENTICATED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  // Raised by the upload limits (file size): only identity documents are uploaded.
  [HttpStatus.PAYLOAD_TOO_LARGE]: "INVALID_DOCUMENT",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
};

/** Turns every error into the shared { code, message } format (CLAUDE.md §5.3). */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toApiError(exception);
    response.status(status).json(body);
  }

  private toApiError(exception: unknown): { status: number; body: ApiError } {
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { code: "INTERNAL_ERROR", message: "Internal server error" },
      };
    }

    const status = exception.getStatus();
    // Thrown by ApiException: already in the right format.
    const parsed = apiErrorSchema.safeParse(exception.getResponse());
    if (parsed.success) {
      return { status, body: parsed.data };
    }
    // Errors thrown by NestJS itself (unknown route, malformed JSON…).
    return {
      status,
      body: { code: CODE_BY_STATUS[status] ?? "INTERNAL_ERROR", message: exception.message },
    };
  }
}
