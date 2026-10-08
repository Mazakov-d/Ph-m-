import { describe, expect, it } from "vitest";
import {
  createEditorApplicationInputSchema,
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

describe("createEditorApplicationInputSchema (docs/DECISIONS.md: editor applications)", () => {
  const base = {
    legalFirstName: "Camille",
    legalLastName: "Durand",
    editorialLine: "Ligne",
    ownerName: "Société",
    ownerGroup: null,
  };
  const works = ["https://a.fr/1", "https://a.fr/2", "https://a.fr/3"];
  const valid = (application: object) =>
    createEditorApplicationInputSchema.safeParse({ ...base, ...application }).success;

  it("asks a journalist or an independent editor for 3 distinct published works", () => {
    expect(valid({ applicantType: "JOURNALIST", workLinks: works })).toBe(true);
    expect(valid({ applicantType: "INDEPENDENT", workLinks: works.slice(0, 2) })).toBe(false);
    expect(valid({ applicantType: "INDEPENDENT", workLinks: [works[0], works[0], works[0]] })).toBe(
      false,
    );
  });

  it("asks a media group for a valid SIRET, its website, director and an e-mail on its domain", () => {
    const group = {
      applicantType: "MEDIA_GROUP",
      siret: "73282932000074",
      websiteUrl: "https://www.lemonde.fr",
      publicationDirector: "Jeanne Martin",
      professionalEmail: "jeanne@lemonde.fr",
    };
    expect(valid(group)).toBe(true);
    expect(valid({ ...group, siret: "73282932000075" })).toBe(false);
    expect(valid({ ...group, professionalEmail: "jeanne@gmail.com" })).toBe(false);
    expect(valid({ ...group, publicationDirector: null })).toBe(false);
  });

  it("asks a social media account for its link and 3 publications", () => {
    const social = {
      applicantType: "SOCIAL_MEDIA",
      socialAccountUrl: "https://www.instagram.com/actu",
      workLinks: works,
    };
    expect(valid(social)).toBe(true);
    expect(valid({ ...social, socialAccountUrl: null })).toBe(false);
  });
});

describe("editorDecisionInputSchema", () => {
  it("lists the checked proofs with a validation", () => {
    expect(
      editorDecisionInputSchema.safeParse({ status: "INDEPENDENT", checkedProofs: ["IDENTITY"] })
        .success,
    ).toBe(true);
    expect(editorDecisionInputSchema.safeParse({ status: "INDEPENDENT" }).success).toBe(false);
  });
});
