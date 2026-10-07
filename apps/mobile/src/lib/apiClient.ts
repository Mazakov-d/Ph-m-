import {
  apiErrorSchema,
  type ApiError,
  type AuthSession,
  authSessionSchema,
  CLIENT_KIND_HEADER,
  type ErrorCode,
} from "@fama/shared";
import { Platform } from "react-native";
import type { ZodType } from "zod";
import { resolveApiUrl } from "./apiUrl";
import { tokenStorage } from "./tokenStorage";

const API_URL = resolveApiUrl();
const IS_WEB = Platform.OS === "web";
const HTTP_UNAUTHORIZED = 401;
const HTTP_NO_CONTENT = 204;

/** An error answered by the API ({ code, message }), or a network failure. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "NETWORK_ERROR",
    message: string,
    readonly issues: ApiError["issues"] = undefined,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type SessionListener = (session: AuthSession | null) => void;

// The access token lives in memory only (docs/DECISIONS.md).
let accessToken: string | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
const sessionListeners = new Set<SessionListener>();

function notifySession(session: AuthSession | null): void {
  sessionListeners.forEach((listener) => listener(session));
}

async function send(method: string, path: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { [CLIENT_KIND_HEADER]: IS_WEB ? "web" : "native" };
  const isForm = body instanceof FormData;
  // A multipart form sets its own Content-Type (with the boundary); JSON needs it explicitly.
  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined || isForm ? body : JSON.stringify(body),
      // Web: lets the browser send the httpOnly refresh cookie.
      credentials: IS_WEB ? "include" : "omit",
    });
  } catch {
    throw new ApiRequestError(0, "NETWORK_ERROR", "API unreachable");
  }
}

async function parseResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
  const data: unknown = response.status === HTTP_NO_CONTENT ? undefined : await response.json();
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(data);
    if (error.success) {
      throw new ApiRequestError(
        response.status,
        error.data.code,
        error.data.message,
        error.data.issues,
      );
    }
    throw new ApiRequestError(response.status, "INTERNAL_ERROR", "Unexpected API error");
  }
  // CLAUDE.md §6.2: every API response is validated with its shared schema.
  return schema.parse(data);
}

/** Exchanges the refresh token for a new session; several callers share one request. */
function refreshSession(): Promise<AuthSession | null> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      // Native without a stored token: nothing to refresh. Web: the cookie is sent automatically.
      if (!IS_WEB && !refreshToken) {
        return null;
      }
      const response = await send("POST", "/auth/refresh", refreshToken ? { refreshToken } : {});
      const session = await parseResponse(response, authSessionSchema);
      await startSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "NETWORK_ERROR") {
        throw error;
      }
      await endSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Sends a request; on an expired access token, refreshes the session once and retries. */
async function sendWithRefresh(method: string, path: string, body: unknown): Promise<Response> {
  const response = await send(method, path, body);
  const isAuthRoute = path.startsWith("/auth/") && path !== "/auth/me";
  if (response.status === HTTP_UNAUTHORIZED && !isAuthRoute) {
    const session = await refreshSession();
    if (session) {
      return send(method, path, body);
    }
  }
  return response;
}

async function request<T>(method: string, path: string, body: unknown, schema: ZodType<T>) {
  return parseResponse(await sendWithRefresh(method, path, body), schema);
}

/** Downloads a file (e.g. an identity document) with the session's credentials. */
async function getBlob(path: string): Promise<Blob> {
  const response = await sendWithRefresh("GET", path, undefined);
  if (!response.ok) {
    // Error answers are JSON ({ code, message }): reuse the usual error handling.
    await parseResponse(response, apiErrorSchema);
  }
  return response.blob();
}

async function startSession(session: AuthSession): Promise<void> {
  accessToken = session.tokens.accessToken;
  await tokenStorage.save(session.tokens);
  notifySession(session);
}

async function endSession(): Promise<void> {
  accessToken = null;
  await tokenStorage.clear();
  notifySession(null);
}

export const apiClient = {
  get: <T>(path: string, schema: ZodType<T>) => request("GET", path, undefined, schema),
  post: <T>(path: string, body: unknown, schema: ZodType<T>) => request("POST", path, body, schema),
  patch: <T>(path: string, body: unknown, schema: ZodType<T>) =>
    request("PATCH", path, body, schema),
  delete: <T>(path: string, schema: ZodType<T>) => request("DELETE", path, undefined, schema),
  getBlob,
  /** Multipart upload (files). */
  postForm: <T>(path: string, form: FormData, schema: ZodType<T>) =>
    request("POST", path, form, schema),

  /** Stores a session obtained by signing in or up. */
  startSession,
  /** Forgets the session locally (tokens and listeners). */
  endSession,
  /** Restores the session at app start; null when the user is not signed in. */
  refreshSession,

  /** Called with the new session after a refresh, or null when the session has ended. */
  onSessionChange(listener: SessionListener): () => void {
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  },
};
