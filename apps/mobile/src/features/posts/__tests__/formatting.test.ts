import { wrapSelection } from "../formatting";

describe("wrapSelection (interface brief: bold and italic)", () => {
  it("puts the markers around the selected word", () => {
    expect(wrapSelection("un vote serré", { start: 3, end: 7 }, "**")).toBe("un **vote** serré");
  });

  it("leaves the spaces at the edges of the selection outside the markers", () => {
    expect(wrapSelection("un vote serré", { start: 2, end: 8 }, "*")).toBe("un *vote* serré");
  });

  it("accepts a selection made from right to left", () => {
    expect(wrapSelection("un vote", { start: 7, end: 3 }, "*")).toBe("un *vote*");
  });

  it("inserts both markers at the cursor when nothing is selected", () => {
    expect(wrapSelection("un ", { start: 3, end: 3 }, "**")).toBe("un ****");
  });
});
