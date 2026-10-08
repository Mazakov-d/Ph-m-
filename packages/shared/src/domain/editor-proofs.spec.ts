import { describe, expect, it } from "vitest";
import {
  EDITOR_PROOFS,
  isEmailOnWebsiteDomain,
  isValidSiret,
  missingRequiredProofs,
  newVerificationCode,
} from "./editor-proofs.js";
import { seededRandom } from "./weighted-feed.js";

describe("EDITOR_PROOFS (docs/DECISIONS.md: editor applications)", () => {
  it("always requires an identity", () => {
    for (const proofs of Object.values(EDITOR_PROOFS)) {
      expect(proofs.required).toContain("IDENTITY");
    }
  });

  it("lists what is missing before a validation", () => {
    expect(missingRequiredProofs("JOURNALIST", ["IDENTITY"])).toEqual(["PUBLISHED_WORKS"]);
    expect(missingRequiredProofs("JOURNALIST", ["IDENTITY", "PUBLISHED_WORKS"])).toEqual([]);
    expect(missingRequiredProofs("SOCIAL_MEDIA", [])).toEqual([
      "IDENTITY",
      "ACCOUNT_OWNERSHIP",
      "PUBLICATION_LINKS",
    ]);
  });
});

describe("isValidSiret", () => {
  it("accepts a SIRET with a valid checksum", () => {
    expect(isValidSiret("73282932000074")).toBe(true);
  });

  it("refuses a typing mistake, letters or a wrong length", () => {
    expect(isValidSiret("73282932000075")).toBe(false);
    expect(isValidSiret("7328293200007A")).toBe(false);
    expect(isValidSiret("7328293200007")).toBe(false);
  });
});

describe("isEmailOnWebsiteDomain", () => {
  it("accepts an e-mail on the website's domain or a sub-domain", () => {
    expect(isEmailOnWebsiteDomain("jeanne@lemonde.fr", "https://www.lemonde.fr")).toBe(true);
    expect(isEmailOnWebsiteDomain("jeanne@redaction.lemonde.fr", "https://lemonde.fr/")).toBe(true);
  });

  it("refuses another domain", () => {
    expect(isEmailOnWebsiteDomain("jeanne@gmail.com", "https://www.lemonde.fr")).toBe(false);
    expect(isEmailOnWebsiteDomain("jeanne@lemonde.fr.evil.com", "https://www.lemonde.fr")).toBe(
      false,
    );
  });
});

describe("newVerificationCode", () => {
  it("writes PHEME- and 6 unambiguous characters", () => {
    expect(newVerificationCode(seededRandom("x"))).toMatch(/^PHEME-[A-HJ-NP-Z2-9]{6}$/);
  });
});
