import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cursorQuerySchema, paginated, sourceSchema } from "./common.js";

describe("cursorQuerySchema", () => {
  it("defaults to 20 items without cursor", () => {
    expect(cursorQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("coerces the limit from the query string", () => {
    expect(cursorQuerySchema.parse({ limit: "50", cursor: "abc" })).toEqual({
      limit: 50,
      cursor: "abc",
    });
  });

  it("rejects a limit above 50 or below 1", () => {
    expect(cursorQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(cursorQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });
});

describe("paginated()", () => {
  const page = paginated(z.object({ id: z.string() }));

  it("accepts a last page with a null cursor", () => {
    expect(page.safeParse({ items: [{ id: "a" }], nextCursor: null }).success).toBe(true);
  });

  it("validates each item", () => {
    expect(page.safeParse({ items: [{ id: 1 }], nextCursor: null }).success).toBe(false);
  });
});

describe("sourceSchema", () => {
  it("accepts a URL or a text reference", () => {
    expect(sourceSchema.safeParse("https://www.insee.fr/fr/statistiques").success).toBe(true);
    expect(sourceSchema.safeParse("Rapport annuel de la Cour des comptes, 2026").success).toBe(
      true,
    );
  });

  it("rejects a blank source and one over 500 characters", () => {
    expect(sourceSchema.safeParse("   ").success).toBe(false);
    expect(sourceSchema.safeParse("a".repeat(501)).success).toBe(false);
  });
});
