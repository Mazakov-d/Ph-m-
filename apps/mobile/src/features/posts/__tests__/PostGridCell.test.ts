import { ARTICLE_CARD } from "../../../test/fixtures";
import { gridCellKey, toGridCells } from "../components/PostGridCell";

describe("toGridCells (interface brief)", () => {
  const posts = ["a", "b", "c"].map((id) => ({ ...ARTICLE_CARD, id }));

  it("completes the last row with empty cells", () => {
    expect(toGridCells(posts, 2)).toHaveLength(4);
    expect(toGridCells(posts, 2)[3]).toBeNull();
    expect(toGridCells(posts.slice(0, 1), 3)).toEqual([posts[0], null, null]);
  });

  it("adds nothing to a full row or a single column", () => {
    expect(toGridCells(posts, 3)).toEqual(posts);
    expect(toGridCells(posts, 1)).toEqual(posts);
    expect(toGridCells([], 3)).toEqual([]);
  });

  it("keys the empty cells by position", () => {
    expect(gridCellKey(null, 4)).toBe("empty-4");
  });
});
