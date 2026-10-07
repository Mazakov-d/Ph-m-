import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index";

describe("shared package entry point", () => {
  it("exports the application name", () => {
    expect(APP_NAME).toBe("Fama");
  });
});
