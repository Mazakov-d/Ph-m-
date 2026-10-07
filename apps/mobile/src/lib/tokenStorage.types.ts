import type { AuthTokens } from "@fama/shared";

/** Where the refresh token survives app restarts (docs/DECISIONS.md). */
export type TokenStorage = {
  getRefreshToken: () => Promise<string | null>;
  save: (tokens: AuthTokens) => Promise<void>;
  clear: () => Promise<void>;
};
