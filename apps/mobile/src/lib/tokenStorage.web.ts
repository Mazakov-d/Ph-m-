// Web (docs/DECISIONS.md): the refresh token is an httpOnly cookie set by the API.
// JavaScript can neither read nor write it, so there is nothing to store here.
import type { TokenStorage } from "./tokenStorage.types";

export const tokenStorage: TokenStorage = {
  getRefreshToken: async () => null,
  save: async () => undefined,
  clear: async () => undefined,
};
