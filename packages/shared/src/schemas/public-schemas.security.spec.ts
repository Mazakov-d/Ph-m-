import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as schemas from "./index.js";

/**
 * ROADMAP phase 11 + CLAUDE.md §4.3: a public schema never contains private data (e-mail,
 * non-public legal identity, report weights, internal counters, secrets).
 */
const FORBIDDEN_KEYS = [
  "email",
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "weight",
  "totalReportWeight",
  "reporterId",
  "legalFirstName",
  "legalLastName",
  "documentKeys",
  "upheldReportCount",
  "dismissedReportCount",
  "viewCount",
  "conflictEditorIds",
  "suspendedUntil",
  "bannedAt",
];

/** Every key of an object schema, including nested objects, arrays, unions and wrappers. */
function collectKeys(schema: z.core.$ZodType, path = ""): string[] {
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape).flatMap(([key, value]) => [
      `${path}${key}`,
      ...collectKeys(value, `${path}${key}.`),
    ]);
  }
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return collectKeys(schema.unwrap(), path);
  }
  if (schema instanceof z.ZodArray) {
    return collectKeys(schema.element, path);
  }
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    return schema.options.flatMap((option) => collectKeys(option, path));
  }
  return [];
}

const publicSchemas: { name: string; schema: z.core.$ZodType }[] = [];
for (const [name, value] of Object.entries(schemas)) {
  if (name.endsWith("PublicSchema") && value instanceof z.ZodType) {
    publicSchemas.push({ name, schema: value });
  }
}

describe("public schemas carry no private data (ROADMAP phase 11)", () => {
  it("covers every public schema", () => {
    expect(publicSchemas.length).toBeGreaterThanOrEqual(18);
  });

  it.each(publicSchemas)("$name", ({ schema }) => {
    const leaks = collectKeys(schema).filter((path) =>
      FORBIDDEN_KEYS.includes(path.split(".").at(-1) ?? ""),
    );
    expect(leaks).toEqual([]);
  });

  it("detects a leak (self-check of the walker)", () => {
    const leaky = z.object({ author: z.object({ email: z.email() }).nullable() });
    expect(collectKeys(leaky)).toContain("author.email");
  });
});
