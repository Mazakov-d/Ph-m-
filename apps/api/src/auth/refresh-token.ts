import { createHash, randomBytes } from "node:crypto";

const REFRESH_TOKEN_BYTES = 32;

/** A random, unguessable refresh token, sent once to the client. */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

/** Only this hash is stored, so a database leak does not expose usable tokens. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
