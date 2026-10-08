import type { AuthUser, LoginInput, RegisterInput } from "@fama/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi } from "../features/auth/api";
import { unregisterThisPhone } from "../features/notifications/api";
import { apiClient } from "../lib/apiClient";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  // Who was signed in, to clear the cache only when that person signs out.
  const signedInUserId = useRef<string | null>(null);

  // Sync with apiClient, which owns the tokens: sign-in, refresh and expiry all go through it.
  useEffect(() => {
    const unsubscribe = apiClient.onSessionChange((session) => {
      // Never show one account's data to the next one. Only on a real sign-out: clearing when
      // an anonymous visitor's session check fails would drop the queries already in flight.
      if (!session && signedInUserId.current !== null) {
        queryClient.clear();
      }
      signedInUserId.current = session?.user.id ?? null;
      setUser(session?.user ?? null);
      setStatus(session ? "authenticated" : "anonymous");
    });

    // Restores the session kept from a previous launch (SecureStore or web cookie).
    apiClient
      .refreshSession()
      .then((session) => {
        if (!session) {
          setStatus("anonymous");
        }
      })
      .catch(() => setStatus("anonymous"));

    return unsubscribe;
  }, [queryClient]);

  const signIn = useCallback(async (input: LoginInput) => {
    await apiClient.startSession(await authApi.login(input));
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    await apiClient.startSession(await authApi.register(input));
  }, []);

  const signOut = useCallback(async () => {
    try {
      // docs/DECISIONS.md: the phone stops receiving this account's push notifications.
      await unregisterThisPhone().catch(() => undefined);
      await authApi.logout();
    } finally {
      // Even if the API is unreachable, the device forgets the session.
      await apiClient.endSession();
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
