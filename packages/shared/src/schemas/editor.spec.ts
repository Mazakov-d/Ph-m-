import { describe, expect, it } from "vitest";
import {
  editorDecisionInputSchema,
  editorPublicSchema,
  updateDonationLinkInputSchema,
} from "./editor.js";

const profile = {
  id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  pseudo: "LeMonde",
  editorStatus: "CERTIFIED",
  editorialLine: "Quotidien d'information générale.",
  ownerName: "Groupe Le Monde",
  ownerGroup: null,
  reliability: "INSUFFICIENT_HISTORY",
  donationUrl: null,
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

describe("updateDonationLinkInputSchema (docs/DECISIONS.md: donations)", () => {
  it("accepts a secure link, or null to remove it", () => {
    expect(
      updateDonationLinkInputSchema.safeParse({ donationUrl: "https://fr.tipeee.com/le-media" })
        .success,
    ).toBe(true);
    expect(updateDonationLinkInputSchema.safeParse({ donationUrl: null }).success).toBe(true);
  });

  it("refuses an insecure link or something else than a link", () => {
    for (const donationUrl of ["http://fr.tipeee.com/le-media", "javascript:alert(1)", "tipeee"]) {
      expect(updateDonationLinkInputSchema.safeParse({ donationUrl }).success).toBe(false);
    }
  });
});
