/** Types of files the API accepts, recognized from their content. */
export type FileType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

// File signatures ("magic numbers"): the declared type of an upload cannot be trusted.
// `null` matches any byte (WebP has its size between "RIFF" and "WEBP").
const SIGNATURES: { type: FileType; bytes: (number | null)[] }[] = [
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // "RIFF" + 4 size bytes + "WEBP"
  {
    type: "image/webp",
    bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
];

export const FILE_EXTENSIONS: Record<FileType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** The real type of a file if it is one of `accepted`, otherwise null. */
export function detectFileType<Accepted extends FileType>(
  bytes: Uint8Array,
  accepted: readonly Accepted[],
): Accepted | null {
  const match = SIGNATURES.find(({ bytes: signature }) =>
    signature.every((byte, index) => byte === null || bytes[index] === byte),
  );
  return accepted.find((type) => type === match?.type) ?? null;
}
