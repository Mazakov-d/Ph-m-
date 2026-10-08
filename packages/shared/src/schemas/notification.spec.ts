import { describe, expect, it } from "vitest";
import { createAlertInputSchema } from "./notification.js";

describe("createAlertInputSchema (push notifications)", () => {
  it("accepts a theme, a zone, or both", () => {
    for (const alert of [
      { theme: "SPORT", zone: null, locality: null },
      { theme: null, zone: "FRANCE", locality: null },
      { theme: "SPORT", zone: "FRANCE", locality: null },
    ]) {
      expect(createAlertInputSchema.safeParse(alert).success).toBe(true);
    }
  });

  it("refuses an alert without theme nor zone", () => {
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: null, locality: null }).success,
    ).toBe(false);
  });

  it("names a region or a city with the LOCAL zone, and only with it", () => {
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: "LOCAL", locality: "BRETAGNE" })
        .success,
    ).toBe(true);
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: "FRANCE", locality: "BRETAGNE" })
        .success,
    ).toBe(false);
  });
});
