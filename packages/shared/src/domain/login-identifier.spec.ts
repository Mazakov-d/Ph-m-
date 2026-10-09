import { describe, expect, it } from "vitest";
import { pseudoSchema } from "../schemas/auth.js";
import { parseLoginIdentifier } from "./login-identifier.js";

describe("parseLoginIdentifier", () => {
  it("reads an identifier with « @ » as an e-mail address, in lower case", () => {
    expect(parseLoginIdentifier(" Lea@Test.fr ")).toEqual({ kind: "email", email: "lea@test.fr" });
  });

  it("reads any other identifier as a pseudo, keeping its case", () => {
    expect(parseLoginIdentifier(" Le Monde ")).toEqual({ kind: "pseudo", pseudo: "Le Monde" });
  });

  it("relies on pseudos never containing « @ »", () => {
    expect(pseudoSchema.safeParse("lea@test").success).toBe(false);
  });
});
