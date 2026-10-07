// iOS and Android: the refresh token is kept in the device keychain / keystore.
// The access token is never stored: it lives in memory (apiClient).
import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "./tokenStorage.types";

const REFRESH_TOKEN_KEY = "fama.refreshToken";

export const tokenStorage: TokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),

  save: async (tokens) => {
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  },

  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
