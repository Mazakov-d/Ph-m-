import { describe, expect, expectTypeOf, it } from "vitest";
import type { PermissionSubject } from "../permissions.js";
import { type AuthUser, registerInputSchema } from "./auth.js";

const validInput = { email: "Lea@Example.fr", password: "a".repeat(12), pseudo: "Léa_92" };

describe("registerInputSchema (SPEC §2.1)", () => {
  it("accepts a valid sign-up and normalizes the e-mail", () => {
    expect(registerInputSchema.parse(validInput).email).toBe("lea@example.fr");
  });

  it("requires a 12-character password", () => {
    expect(registerInputSchema.safeParse({ ...validInput, password: "a".repeat(11) }).success).toBe(
      false,
    );
  });

  it("limits the password to 128 characters", () => {
    expect(
      registerInputSchema.safeParse({ ...validInput, password: "a".repeat(129) }).success,
    ).toBe(false);
  });

  it.each(["ab", "a".repeat(31), "léa dupont", "léa@home", "<script>"])(
    "rejects the pseudo %s",
    (pseudo) => {
      expect(registerInputSchema.safeParse({ ...validInput, pseudo }).success).toBe(false);
    },
  );

  it.each(["abc", "a".repeat(30), "Éloïse.M", "jean-paul_2"])("accepts the pseudo %s", (pseudo) => {
    expect(registerInputSchema.safeParse({ ...validInput, pseudo }).success).toBe(true);
  });

  it("rejects an invalid e-mail", () => {
    expect(registerInputSchema.safeParse({ ...validInput, email: "lea" }).success).toBe(false);
  });
});

describe("AuthUser", () => {
  it("can be passed to can()", () => {
    expectTypeOf<AuthUser>().toExtend<PermissionSubject>();
  });
});
