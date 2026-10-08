import { describe, expect, it } from "vitest";
import { createPostInputSchema, postQuerySchema } from "./post.js";

const validPost = {
  kind: "ARTICLE",
  title: "Le budget 2027 adopté",
  summary: "L'Assemblée a adopté le budget en première lecture.",
  body: "Texte de l'article.",
  sources: ["https://www.assemblee-nationale.fr"],
  zone: "FRANCE",
  region: null,
  theme: "POLITICS",
};

describe("createPostInputSchema (SPEC §3)", () => {
  it("accepts a complete post and enables comments by default", () => {
    expect(createPostInputSchema.parse(validPost).commentsEnabled).toBe(true);
  });

  it.each(["title", "summary", "body", "sources", "zone", "theme", "kind"])(
    "requires %s",
    (field) => {
      const post = Object.fromEntries(Object.entries(validPost).filter(([key]) => key !== field));
      expect(createPostInputSchema.safeParse(post).success).toBe(false);
    },
  );

  it("lets an opinion have no source (SPEC §3)", () => {
    expect(
      createPostInputSchema.safeParse({ ...validPost, kind: "OPINION", sources: [] }).success,
    ).toBe(true);
  });

  it("requires at least one source for an article and at most 20", () => {
    expect(createPostInputSchema.safeParse({ ...validPost, sources: [] }).success).toBe(false);
    const sources = Array.from({ length: 21 }, (_, i) => `Source ${i}`);
    expect(createPostInputSchema.safeParse({ ...validPost, sources }).success).toBe(false);
  });

  it("rejects a blank title", () => {
    expect(createPostInputSchema.safeParse({ ...validPost, title: "   " }).success).toBe(false);
  });

  it("limits the title to 200 and the summary to 500 characters", () => {
    expect(createPostInputSchema.safeParse({ ...validPost, title: "a".repeat(201) }).success).toBe(
      false,
    );
    expect(
      createPostInputSchema.safeParse({ ...validPost, summary: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("requires a region for a LOCAL zone", () => {
    expect(createPostInputSchema.safeParse({ ...validPost, zone: "LOCAL" }).success).toBe(false);
    expect(
      createPostInputSchema.safeParse({ ...validPost, zone: "LOCAL", region: "Bretagne" }).success,
    ).toBe(true);
  });

  it("forbids a region outside the LOCAL zone", () => {
    expect(createPostInputSchema.safeParse({ ...validPost, region: "Bretagne" }).success).toBe(
      false,
    );
  });
});

describe("createPostInputSchema — answer choices (SPEC §7)", () => {
  const opinion = { ...validPost, kind: "OPINION" };

  it("lets an opinion omit its choices (the defaults apply)", () => {
    expect(createPostInputSchema.safeParse(opinion).success).toBe(true);
  });

  it("accepts 2 to 4 choices of 50 characters at most", () => {
    const choices = ["Oui", "Non", "Sans avis", "a".repeat(50)];
    expect(createPostInputSchema.safeParse({ ...opinion, voteOptions: choices }).success).toBe(
      true,
    );
    expect(createPostInputSchema.safeParse({ ...opinion, voteOptions: ["Seul"] }).success).toBe(
      false,
    );
    expect(
      createPostInputSchema.safeParse({ ...opinion, voteOptions: [...choices, "Cinq"] }).success,
    ).toBe(false);
    expect(
      createPostInputSchema.safeParse({ ...opinion, voteOptions: ["Oui", "a".repeat(51)] }).success,
    ).toBe(false);
  });

  it("refuses two identical choices, whatever their case", () => {
    expect(
      createPostInputSchema.safeParse({ ...opinion, voteOptions: ["D'accord", "d'ACCORD"] })
        .success,
    ).toBe(false);
  });

  it("refuses choices on an article", () => {
    expect(
      createPostInputSchema.safeParse({ ...validPost, voteOptions: ["Oui", "Non"] }).success,
    ).toBe(false);
  });
});

describe("postQuerySchema (SPEC §4.3)", () => {
  it("has no filter by default and is chronological", () => {
    expect(postQuerySchema.parse({})).toEqual({ limit: 20, today: false, sort: "RECENT" });
  });

  it("accepts the weighted feed with a seed of at most 64 characters (SPEC §4.2)", () => {
    expect(postQuerySchema.parse({ sort: "WEIGHTED", seed: "abc" })).toMatchObject({
      sort: "WEIGHTED",
      seed: "abc",
    });
    expect(postQuerySchema.safeParse({ sort: "WEIGHTED", seed: "x".repeat(65) }).success).toBe(
      false,
    );
  });

  it("combines today, zone and theme from the query string", () => {
    expect(postQuerySchema.parse({ today: "true", zone: "EUROPE", theme: "TECH" })).toEqual({
      limit: 20,
      today: true,
      zone: "EUROPE",
      theme: "TECH",
      sort: "RECENT",
    });
  });

  it("rejects an unknown zone", () => {
    expect(postQuerySchema.safeParse({ zone: "MARS" }).success).toBe(false);
  });
});
