import {
  authSessionSchema,
  type LoginInput,
  type RegisterInput,
  type UpdatePasswordInput,
} from "@fama/shared";
import { z } from "zod";
import { apiClient } from "../../lib/apiClient";
import { tokenStorage } from "../../lib/tokenStorage";

export const authApi = {
  login: (input: LoginInput) => apiClient.post("/auth/login", input, authSessionSchema),

  register: (input: RegisterInput) => apiClient.post("/auth/register", input, authSessionSchema),

  /** docs/DECISIONS.md (password change): answers with a new session for this device. */
  updatePassword: (input: UpdatePasswordInput) =>
    apiClient.post("/auth/password", input, authSessionSchema),

  /** Revokes the refresh token (body on native, cookie on web). */
  logout: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    await apiClient.post("/auth/logout", refreshToken ? { refreshToken } : {}, z.undefined());
  },
};
