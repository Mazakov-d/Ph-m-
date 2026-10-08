import { describe, expect, it } from "vitest";
import { EDITOR_REPLY_HOURS } from "../rules.js";
import { isWithinEditorWindow } from "./editor-window.js";

const VERDICT = new Date("2026-10-08T10:00:00.000Z");
const at = (iso: string) => new Date(iso);

describe("isWithinEditorWindow (SPEC §5.5)", () => {
  it("is open right after the verdict", () => {
    expect(isWithinEditorWindow(VERDICT, at("2026-10-08T10:00:00.000Z"), EDITOR_REPLY_HOURS)).toBe(
      true,
    );
  });

  it("is open one millisecond before 48 hours", () => {
    expect(isWithinEditorWindow(VERDICT, at("2026-10-10T09:59:59.999Z"), EDITOR_REPLY_HOURS)).toBe(
      true,
    );
  });

  it("is closed at exactly 48 hours", () => {
    expect(isWithinEditorWindow(VERDICT, at("2026-10-10T10:00:00.000Z"), EDITOR_REPLY_HOURS)).toBe(
      false,
    );
  });
});
