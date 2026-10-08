import { formatSegments } from "@fama/shared";
import { formattedTextToHtml, type RichNode, richNodesToSegments } from "../richText";

const text = (content: string): RichNode => ({
  nodeType: 3,
  nodeName: "#text",
  textContent: content,
  childNodes: [],
});
const element = (nodeName: string, children: RichNode[], style?: RichNode["style"]): RichNode => ({
  nodeType: 1,
  nodeName,
  textContent: null,
  childNodes: children,
  style,
});
const editor = (children: RichNode[]) => element("DIV", children);
const stored = (root: RichNode) => formatSegments(richNodesToSegments(root));

describe("richNodesToSegments (interface brief: the text editor)", () => {
  it("reads bold and italic tags, even nested", () => {
    const root = editor([
      text("Un "),
      element("B", [text("vote "), element("I", [text("serré")])]),
      text(" hier"),
    ]);
    expect(stored(root)).toBe("Un **vote** ***serré*** hier");
  });

  it("reads STRONG and EM like B and I", () => {
    expect(stored(editor([element("STRONG", [text("a")]), element("EM", [text("b")])]))).toBe(
      "**a***b*",
    );
  });

  it("reads a bold or italic style set by the browser on a span", () => {
    const root = editor([
      element("SPAN", [text("gras")], { fontWeight: "700" }),
      text(" "),
      element("SPAN", [text("penché")], { fontStyle: "italic" }),
      text(" "),
      element("SPAN", [text("normal")], { fontWeight: "400" }),
    ]);
    expect(stored(root)).toBe("**gras** *penché* normal");
  });

  it("turns the lines written as <div> and <br> into line breaks", () => {
    const root = editor([
      text("ligne 1"),
      element("DIV", [text("ligne 2")]),
      element("DIV", [element("BR", [])]),
      element("DIV", [text("ligne 4")]),
    ]);
    expect(stored(root)).toBe("ligne 1\nligne 2\n\nligne 4");
  });

  it("ignores the <br> a browser leaves at the end", () => {
    expect(stored(editor([text("fin"), element("BR", [])]))).toBe("fin");
  });

  it("gives an empty text for an empty editor", () => {
    expect(stored(editor([]))).toBe("");
  });
});

describe("formattedTextToHtml", () => {
  it("writes bold, italic and line breaks as HTML", () => {
    expect(formattedTextToHtml("Un **vote**\n***très*** *serré*")).toBe(
      "Un <b>vote</b><br><b><i>très</i></b> <i>serré</i>",
    );
  });

  it("escapes the characters that HTML would read as tags", () => {
    expect(formattedTextToHtml('a < b & "c"')).toBe("a &lt; b &amp; &quot;c&quot;");
  });
});
