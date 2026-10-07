import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ApiError, ErrorCode } from "@fama/shared";

/** An error whose JSON body follows the shared { code, message } format (CLAUDE.md §5.3). */
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, issues?: ApiError["issues"]) {
    const body: ApiError = issues ? { code, message, issues } : { code, message };
    super(body, status);
  }
}
