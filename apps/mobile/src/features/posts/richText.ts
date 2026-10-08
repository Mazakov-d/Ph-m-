import { parseInlineFormatting, type TextSegment } from "@fama/shared";

/**
 * The part of a DOM node the editor reads. Declared here (instead of using `Node`) so that the
 * conversion is tested without a browser.
 */
export type RichNode = {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<RichNode>;
  style?: { fontWeight?: string; fontStyle?: string };
};

const TEXT_NODE = 3;
const BOLD_TAGS = new Set(["B", "STRONG"]);
const ITALIC_TAGS = new Set(["I", "EM"]);
// A browser writes each new line of an editable area as a <div> (Chrome, Safari) or a <p>.
const LINE_TAGS = new Set(["DIV", "P"]);
const BOLD_WEIGHTS = new Set(["bold", "bolder", "600", "700", "800", "900"]);

type Style = { bold: boolean; italic: boolean };

/** The text of the editor with its bold and italic parts, lines separated by « \n ». */
export function richNodesToSegments(root: RichNode): TextSegment[] {
  const segments: TextSegment[] = [];
  const visitChildren = (parent: RichNode, style: Style) => {
    const children = Array.from(parent.childNodes);
    children.forEach((child, index) => {
      // A <br> ending a line only keeps that line visible: it is not a line break of the text.
      const isLineEndBreak =
        child.nodeName === "BR" && index === children.length - 1 && LINE_TAGS.has(parent.nodeName);
      if (!isLineEndBreak) {
        visit(child, style, index === 0);
      }
    });
  };
  const visit = (node: RichNode, style: Style, isFirstChild: boolean) => {
    if (node.nodeType === TEXT_NODE) {
      segments.push({ text: node.textContent ?? "", ...style });
      return;
    }
    if (node.nodeName === "BR") {
      segments.push({ text: "\n", bold: false, italic: false });
      return;
    }
    if (LINE_TAGS.has(node.nodeName) && !isFirstChild && segments.length > 0) {
      segments.push({ text: "\n", bold: false, italic: false });
    }
    visitChildren(node, {
      bold: style.bold || BOLD_TAGS.has(node.nodeName) || isBoldStyle(node),
      italic: style.italic || ITALIC_TAGS.has(node.nodeName) || node.style?.fontStyle === "italic",
    });
  };
  visitChildren(root, { bold: false, italic: false });
  return segments;
}

/** The HTML that shows a stored text in the editor (the inverse of richNodesToSegments). */
export function formattedTextToHtml(text: string): string {
  return parseInlineFormatting(text)
    .map((segment) => {
      let html = escapeHtml(segment.text).replaceAll("\n", "<br>");
      if (segment.italic) html = `<i>${html}</i>`;
      if (segment.bold) html = `<b>${html}</b>`;
      return html;
    })
    .join("");
}

function isBoldStyle(node: RichNode): boolean {
  const weight = node.style?.fontWeight;
  return weight !== undefined && BOLD_WEIGHTS.has(weight);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
