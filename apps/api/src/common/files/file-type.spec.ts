import { detectFileType } from "./file-type.js";

const ALL = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
const bytesOf = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe("detectFileType", () => {
  it("recognizes a PDF", () => {
    expect(detectFileType(ascii("%PDF-1.7\n..."), ALL)).toBe("application/pdf");
  });

  it("recognizes a PNG", () => {
    expect(detectFileType(bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0), ALL)).toBe(
      "image/png",
    );
  });

  it("recognizes a JPEG", () => {
    expect(detectFileType(bytesOf(0xff, 0xd8, 0xff, 0xe0, 0), ALL)).toBe("image/jpeg");
  });

  it("recognizes a WebP whatever its size bytes", () => {
    expect(detectFileType(ascii("RIFF\x10\x20\x00\x00WEBPVP8 "), ALL)).toBe("image/webp");
  });

  it("refuses a known type that is not accepted here", () => {
    expect(detectFileType(ascii("%PDF-1.7"), ["image/jpeg", "image/png"])).toBeNull();
  });

  it("rejects a text file renamed .pdf", () => {
    expect(detectFileType(ascii("hello, I am a PDF"), ALL)).toBeNull();
  });

  it("rejects an empty or truncated file", () => {
    expect(detectFileType(bytesOf(), ALL)).toBeNull();
    expect(detectFileType(bytesOf(0xff, 0xd8), ALL)).toBeNull();
  });
});
