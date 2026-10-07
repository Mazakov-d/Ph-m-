import { formatCommentCount, formatPublishedAt } from "../texts";

const NOW = new Date("2026-10-08T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("formatPublishedAt", () => {
  it("says « à l'instant » under a minute", () => {
    expect(formatPublishedAt(ago(59 * 1000), NOW)).toBe("à l'instant");
  });

  it("counts minutes under an hour", () => {
    expect(formatPublishedAt(ago(5 * 60 * 1000), NOW)).toBe("il y a 5 min");
  });

  it("counts hours under a day", () => {
    expect(formatPublishedAt(ago(23 * 60 * 60 * 1000 + 59 * 60 * 1000), NOW)).toBe("il y a 23 h");
  });

  it("shows the date after a day", () => {
    expect(formatPublishedAt(ago(25 * 60 * 60 * 1000), NOW)).toMatch(/7 oct\./);
  });
});

describe("formatCommentCount", () => {
  it.each([
    [0, "Aucun commentaire"],
    [1, "1 commentaire"],
    [12, "12 commentaires"],
  ])("%i → %s", (count, text) => {
    expect(formatCommentCount(count)).toBe(text);
  });
});
