"use dom";

import { formatSegments } from "@fama/shared";
import type { DOMProps } from "expo/dom";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { colors } from "../../../components/ui/theme";
import { formattedTextToHtml, richNodesToSegments } from "../richText";

const TOOLBAR_HEIGHT = 40;

const texts = { bold: "Mettre en gras", italic: "Mettre en italique" };

type Props = {
  label: string;
  /** Must not change while the editor is open: the editor owns its content. */
  initialValue: string;
  /** The CSS `font-family` of the chosen typeface, and the @font-face rules that declare it. */
  fontFamily: string;
  fontFaceCss: string;
  fontSize: number;
  multiline: boolean;
  /** Toolbar included. */
  height: number;
  onChange: (value: string) => void;
  onBlur: () => void;
  dom?: DOMProps;
};

/**
 * Interface brief: the editor of a text block. « B » and « I » apply to the selected words, or,
 * with nothing selected, stay on while the editor types. The text is stored with the markers of
 * shared/domain/inline-formatting. Runs in a web view on iOS and Android (Expo DOM component),
 * because a native text field cannot show bold and italic words while they are typed.
 */
export default function RichTextEditor(props: Props) {
  const { label, initialValue, fontFamily, fontFaceCss, fontSize, multiline, height } = props;
  const { onChange, onBlur } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ bold: false, italic: false });

  // Fills the editor once and follows the cursor to light the buttons up (DOM APIs).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = formattedTextToHtml(initialValue);
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("defaultParagraphSeparator", false, "div");
    const followCursor = () => {
      if (editor.contains(document.getSelection()?.anchorNode ?? null)) {
        setActive({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
        });
      }
    };
    document.addEventListener("selectionchange", followCursor);
    return () => document.removeEventListener("selectionchange", followCursor);
  }, [initialValue]);

  const emitChange = () => {
    if (editorRef.current) {
      onChange(formatSegments(richNodesToSegments(editorRef.current)));
    }
  };

  const toggle = (command: "bold" | "italic") => {
    document.execCommand(command);
    setActive((current) => ({ ...current, [command]: document.queryCommandState(command) }));
    emitChange();
  };

  return (
    <div style={{ ...styles.box, height }}>
      <style>{fontFaceCss}</style>
      <div style={styles.toolbar}>
        {(["bold", "italic"] as const).map((command) => (
          <button
            key={command}
            type="button"
            aria-label={texts[command]}
            aria-pressed={active[command]}
            // Keeps the focus and the selection in the editor.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => toggle(command)}
            style={{
              ...styles.button,
              ...(active[command] ? styles.buttonOn : null),
              fontWeight: command === "bold" ? "bold" : "normal",
              fontStyle: command === "italic" ? "italic" : "normal",
            }}
          >
            {command === "bold" ? "B" : "I"}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label={label}
        aria-multiline={multiline}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={onBlur}
        onKeyDown={(event) => {
          // A title is a single line.
          if (!multiline && event.key === "Enter") event.preventDefault();
        }}
        onPaste={(event) => {
          // Pasted text keeps only its words: the editor sets the formatting.
          event.preventDefault();
          const pasted = event.clipboardData.getData("text/plain");
          document.execCommand(
            "insertText",
            false,
            multiline ? pasted : pasted.replace(/\s+/g, " "),
          );
        }}
        style={{
          ...styles.editor,
          height: height - TOOLBAR_HEIGHT,
          fontFamily,
          fontSize,
          whiteSpace: multiline ? "pre-wrap" : "normal",
        }}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: { display: "flex", flexDirection: "column", boxSizing: "border-box", margin: 0 },
  toolbar: { display: "flex", gap: 8, height: TOOLBAR_HEIGHT, alignItems: "center" },
  button: {
    width: 36,
    height: 32,
    border: `1px solid ${colors.brand}`,
    borderRadius: 6,
    background: colors.surface,
    color: colors.brand,
    fontSize: 16,
    cursor: "pointer",
  },
  buttonOn: { background: colors.brand, color: colors.onBrand },
  editor: {
    boxSizing: "border-box",
    overflowY: "auto",
    padding: 10,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    background: colors.surface,
    color: colors.text,
    lineHeight: 1.5,
    outline: "none",
    overflowWrap: "anywhere",
  },
};
