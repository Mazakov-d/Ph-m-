import { describe, expect, it } from "vitest";
import { APP_NAME, APP_SLOGAN } from "./index.js";

describe("shared package entry point", () => {
  it("exports the application name and slogan", () => {
    expect(APP_NAME).toBe("Fama");
    expect(APP_SLOGAN).toBe("La rumeur, sourcée.");
  });
});
