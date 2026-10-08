import { describe, expect, it } from "vitest";
import type { UserRole } from "./enums.js";
import {
  can,
  isRestricted,
  PERMISSIONS,
  type Permission,
  type PermissionSubject,
} from "./permissions.js";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function subject(role: UserRole, overrides: Partial<PermissionSubject> = {}): PermissionSubject {
  return {
    role,
    editorStatus: role === "EDITOR" ? "INDEPENDENT" : null,
    suspendedUntil: null,
    bannedAt: null,
    ...overrides,
  };
}

// Transcribed from the table of SPEC §2.5 (+ docs/DECISIONS.md): [READER, EDITOR, MODERATOR, ADMIN].
const EXPECTED: Record<Permission, [boolean, boolean, boolean, boolean]> = {
  "post.read": [true, true, true, true],
  "comment.create": [true, true, true, true],
  "vote.cast": [true, true, true, true],
  "report.create": [true, true, true, true],
  "support.open": [true, true, false, false],
  "user.block": [true, true, true, true],
  // docs/DECISIONS.md: not in the SPEC table; only a reader applies for the editor status.
  "editor.apply": [true, false, false, false],
  "post.create": [false, true, false, false],
  "post.toggleComments": [false, true, false, false],
  "moderation.queue.read": [false, false, true, true],
  "moderation.decide": [false, false, true, true],
  "ticket.assign": [false, false, true, true],
  "chat.readAll": [false, false, false, true],
  "editor.validateIndependent": [false, false, true, true],
  "editor.validateCertified": [false, false, false, true],
  "moderator.manage": [false, false, false, true],
  "audit.read": [false, false, false, true],
  // SPEC §5.8 + docs/DECISIONS.md: jurors are volunteer readers.
  "jury.serve": [true, false, false, false],
};
const ROLES: UserRole[] = ["READER", "EDITOR", "MODERATOR", "ADMIN"];

describe("can() — matrix of SPEC §2.5", () => {
  it("covers every permission", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...PERMISSIONS].sort());
  });

  for (const permission of PERMISSIONS) {
    ROLES.forEach((role, index) => {
      const expected = EXPECTED[permission][index];
      it(`${role} ${expected ? "can" : "cannot"} ${permission}`, () => {
        expect(can(subject(role), permission, NOW)).toBe(expected);
      });
    });
  }
});

describe("can() — anonymous visitor (SPEC §2)", () => {
  it("can only read posts", () => {
    for (const permission of PERMISSIONS) {
      expect(can(null, permission, NOW)).toBe(permission === "post.read");
    }
  });
});

describe("can() — editor status (SPEC §2.2)", () => {
  it.each([
    ["PENDING", false],
    ["INDEPENDENT", true],
    ["CERTIFIED", true],
    ["REJECTED", false],
  ] as const)("an editor %s can publish: %s", (editorStatus, expected) => {
    expect(can(subject("EDITOR", { editorStatus }), "post.create", NOW)).toBe(expected);
  });

  it("an editor without status cannot publish", () => {
    expect(can(subject("EDITOR", { editorStatus: null }), "post.create", NOW)).toBe(false);
  });

  it("a pending editor keeps the reader permissions", () => {
    expect(can(subject("EDITOR", { editorStatus: "PENDING" }), "comment.create", NOW)).toBe(true);
  });
});

describe("can() — suspended or banned account (SPEC §6.3, docs/DECISIONS.md)", () => {
  const suspendedEditor = subject("EDITOR", { suspendedUntil: "2026-10-08T12:00:00.000Z" });

  it.each(["post.create", "comment.create", "vote.cast", "report.create"] as const)(
    "a suspended account cannot %s",
    (permission) => {
      expect(can(suspendedEditor, permission, NOW)).toBe(false);
    },
  );

  it.each(["user.block", "post.toggleComments"] as const)(
    "a suspended account cannot %s",
    (permission) => {
      expect(can(suspendedEditor, permission, NOW)).toBe(false);
    },
  );

  it.each(["post.read", "support.open"] as const)("a suspended account can %s", (permission) => {
    expect(can(suspendedEditor, permission, NOW)).toBe(true);
  });

  it("a suspended moderator loses moderation permissions", () => {
    const moderator = subject("MODERATOR", { suspendedUntil: "2026-10-08T12:00:00.000Z" });
    expect(can(moderator, "moderation.decide", NOW)).toBe(false);
    expect(can(moderator, "post.read", NOW)).toBe(true);
  });

  it("a suspended account does not gain support.open if its role lacks it", () => {
    const admin = subject("ADMIN", { suspendedUntil: "2026-10-08T12:00:00.000Z" });
    expect(can(admin, "support.open", NOW)).toBe(false);
  });

  it("a banned account is restricted like a suspended one", () => {
    const banned = subject("READER", { bannedAt: "2026-01-01T00:00:00.000Z" });
    expect(can(banned, "comment.create", NOW)).toBe(false);
    expect(can(banned, "support.open", NOW)).toBe(true);
  });
});

describe("isRestricted()", () => {
  it("is false without suspension nor ban", () => {
    expect(isRestricted(subject("READER"), NOW)).toBe(false);
  });

  it("is true while the suspension runs", () => {
    const user = subject("READER", { suspendedUntil: "2026-10-07T12:00:00.001Z" });
    expect(isRestricted(user, NOW)).toBe(true);
  });

  it("is false once the suspension end date is reached", () => {
    const user = subject("READER", { suspendedUntil: "2026-10-07T12:00:00.000Z" });
    expect(isRestricted(user, NOW)).toBe(false);
  });

  it("is true when banned, whatever the suspension", () => {
    const user = subject("READER", { bannedAt: "2026-10-01T00:00:00.000Z" });
    expect(isRestricted(user, NOW)).toBe(true);
  });
});
