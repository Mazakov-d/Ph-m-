import { ApiException } from "../errors/api.exception.js";
import { decodeCursor, encodeCursor, toPage } from "./cursor.js";

const position = {
  createdAt: new Date("2026-10-07T12:00:00.000Z"),
  id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
};

describe("cursor", () => {
  it("decodes what it encoded", () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it("rejects a forged or damaged cursor", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow(ApiException);
    const forged = Buffer.from(JSON.stringify({ createdAt: "yesterday", id: 1 })).toString(
      "base64url",
    );
    expect(() => decodeCursor(forged)).toThrow(ApiException);
  });

  it("gives a next cursor only when an extra row was fetched", () => {
    const rows = [1, 2, 3].map((n) => ({ ...position, n }));
    expect(toPage(rows, 3, (row) => row).nextCursor).toBeNull();
    const page = toPage(rows, 2, (row) => row);
    expect(page.rows).toHaveLength(2);
    expect(page.nextCursor).not.toBeNull();
  });
});
