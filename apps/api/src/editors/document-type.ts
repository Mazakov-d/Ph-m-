import type { EDITOR_DOCUMENT_TYPES } from "@fama/shared";

export type DocumentType = (typeof EDITOR_DOCUMENT_TYPES)[number];

// File signatures ("magic numbers"): the declared type of an upload cannot be trusted.
const SIGNATURES: { type: DocumentType; bytes: number[] }[] = [
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

export const DOCUMENT_EXTENSIONS: Record<DocumentType, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** The real type of an identity document, or null if it is not an accepted format. */
export function detectDocumentType(bytes: Uint8Array): DocumentType | null {
  const match = SIGNATURES.find(({ bytes: signature }) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
  return match?.type ?? null;
}
