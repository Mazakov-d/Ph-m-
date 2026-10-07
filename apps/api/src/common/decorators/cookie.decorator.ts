import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/** Reads one cookie as a string (undefined when absent or malformed). */
export const Cookie = createParamDecorator((name: string, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  const cookies: unknown = request.cookies;
  if (typeof cookies !== "object" || cookies === null || !(name in cookies)) {
    return undefined;
  }
  const value: unknown = Object.getOwnPropertyDescriptor(cookies, name)?.value;
  return typeof value === "string" ? value : undefined;
});
