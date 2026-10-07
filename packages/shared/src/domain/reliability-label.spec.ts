import { describe, expect, it } from "vitest";
import { reliabilityLabel, type ReliabilityLabelInput } from "./reliability-label.js";

function article(overrides: Partial<ReliabilityLabelInput>): ReliabilityLabelInput {
  return {
    kind: "ARTICLE",
    reviewStatus: "NOT_REVIEWED",
    reportCount: 0,
    verdict: null,
    ...overrides,
  };
}

describe("reliabilityLabel (SPEC §5.6)", () => {
  it("has no bar for an opinion", () => {
    expect(reliabilityLabel(article({ kind: "OPINION", reportCount: 3 }))).toBeNull();
  });

  it("shows « Non examiné » without reports", () => {
    expect(reliabilityLabel(article({}))).toBe("Non examiné");
  });

  it("shows the report count below the threshold", () => {
    expect(reliabilityLabel(article({ reportCount: 2 }))).toBe("Non examiné · 2 signalements");
  });

  it("uses the singular for a single report", () => {
    expect(reliabilityLabel(article({ reportCount: 1 }))).toBe("Non examiné · 1 signalement");
  });

  it("shows a review in progress", () => {
    expect(reliabilityLabel(article({ reviewStatus: "UNDER_REVIEW", reportCount: 7 }))).toBe(
      "7 signalements · en cours d'examen",
    );
  });

  it.each([
    ["ACCURATE", "exact"],
    ["MISSING_CONTEXT", "contexte manquant"],
    ["MISLEADING", "trompeur"],
    ["FALSE", "faux"],
    ["UNVERIFIABLE", "invérifiable"],
  ] as const)("shows the verdict %s as « %s »", (verdict, label) => {
    expect(reliabilityLabel(article({ reviewStatus: "REVIEWED", reportCount: 7, verdict }))).toBe(
      `7 signalements · examiné : ${label}`,
    );
  });

  it("rejects a reviewed post without verdict", () => {
    expect(() => reliabilityLabel(article({ reviewStatus: "REVIEWED", reportCount: 7 }))).toThrow();
  });
});
