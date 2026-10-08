import { describe, expect, it } from "vitest";
import { createAlertInputSchema } from "./notification.js";

describe("createAlertInputSchema (push notifications)", () => {
  it("accepts a theme, a zone, or both", () => {
    for (const alert of [
      { theme: "SPORT", zone: null, region: null },
      { theme: null, zone: "FRANCE", region: null },
      { theme: "SPORT", zone: "FRANCE", region: null },
    ]) {
      expect(createAlertInputSchema.safeParse(alert).success).toBe(true);
    }
  });

  it("refuses an alert without theme nor zone", () => {
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: null, region: null }).success,
    ).toBe(false);
  });

  it("accepts a region only with the LOCAL zone", () => {
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: "LOCAL", region: "Bretagne" }).success,
    ).toBe(true);
    expect(
      createAlertInputSchema.safeParse({ theme: null, zone: "FRANCE", region: "Bretagne" }).success,
    ).toBe(false);
  });
});
