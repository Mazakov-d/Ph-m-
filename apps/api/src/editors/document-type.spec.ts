import { detectDocumentType } from "./document-type.js";

const bytesOf = (...values: number[]) => Uint8Array.from(values);

describe("detectDocumentType", () => {
  it("recognizes a PDF", () => {
    expect(detectDocumentType(new TextEncoder().encode("%PDF-1.7\n..."))).toBe("application/pdf");
  });

  it("recognizes a PNG", () => {
    expect(detectDocumentType(bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      "image/png",
    );
  });

  it("recognizes a JPEG", () => {
    expect(detectDocumentType(bytesOf(0xff, 0xd8, 0xff, 0xe0, 0))).toBe("image/jpeg");
  });

  it("rejects a text file renamed .pdf", () => {
    expect(detectDocumentType(new TextEncoder().encode("hello, I am a PDF"))).toBeNull();
  });

  it("rejects an empty or truncated file", () => {
    expect(detectDocumentType(bytesOf())).toBeNull();
    expect(detectDocumentType(bytesOf(0xff, 0xd8))).toBeNull();
  });
});
