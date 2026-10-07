import { describe, expect, it } from "vitest";
import { editorDecisionInputSchema, editorPublicSchema } from "./editor.js";

const profile = {
  id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  pseudo: "LeMonde",
  editorStatus: "CERTIFIED",
  editorialLine: "Quotidien d'information générale.",
  ownerName: "Groupe Le Monde",
  ownerGroup: null,
};

describe("editorPublicSchema (SPEC §2.2)", () => {
  it("strips unknown fields, so a private field never leaks", () => {
    const parsed = editorPublicSchema.parse({ ...profile, legalFirstName: "Jean" });
    expect(parsed).not.toHaveProperty("legalFirstName");
  });

  it("has no identity key at all when the identity is hidden", () => {
    expect(Object.keys(editorPublicSchema.parse(profile))).not.toContain("legalIdentity");
  });
});

describe("editorDecisionInputSchema (SPEC §2.2)", () => {
  it("requires a reason to reject", () => {
    expect(editorDecisionInputSchema.safeParse({ status: "REJECTED" }).success).toBe(false);
    expect(
      editorDecisionInputSchema.safeParse({
        status: "REJECTED",
        rejectionReason: "Pièces illisibles",
      }).success,
    ).toBe(true);
  });

  it("cannot move an editor back to PENDING", () => {
    expect(editorDecisionInputSchema.safeParse({ status: "PENDING" }).success).toBe(false);
  });
});
