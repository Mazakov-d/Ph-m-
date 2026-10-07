import type { AuthSession } from "@fama/shared";
import { z } from "zod";
import { apiClient, ApiRequestError } from "../apiClient";
import { tokenStorage } from "../tokenStorage";

const user = {
  id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  email: "lea@test.fr",
  pseudo: "Léa",
  role: "READER",
  editorStatus: null,
  suspendedUntil: null,
  bannedAt: null,
} as const;

function session(accessToken: string, refreshToken: string): AuthSession {
  return { user, tokens: { accessToken, refreshToken } };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const expired = () => jsonResponse(401, { code: "UNAUTHENTICATED", message: "expired" });
const fetchMock = jest.spyOn(globalThis, "fetch");
const urlOf = (call: number) => String(fetchMock.mock.calls[call]?.[0]);
function authorizationIn(init: RequestInit | undefined): string | undefined {
  const headers = init?.headers;
  return headers && "Authorization" in headers ? headers.Authorization : undefined;
}
const authorizationOf = (call: number) => authorizationIn(fetchMock.mock.calls[call]?.[1]);

describe("apiClient", () => {
  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("validates the response with the given schema", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "ok" }));
    await expect(apiClient.get("/health", z.object({ status: z.literal("ok") }))).resolves.toEqual({
      status: "ok",
    });
  });

  it("rejects a response that does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 42 }));
    await expect(apiClient.get("/health", z.object({ status: z.string() }))).rejects.toThrow();
  });

  it("turns an API error into an ApiRequestError carrying the code", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { code: "PSEUDO_TAKEN", message: "Pseudo taken" }),
    );
    const error: unknown = await apiClient.post("/auth/register", {}, z.unknown()).catch((e) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 409, code: "PSEUDO_TAKEN" });
  });

  it("reports an unreachable API as NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(apiClient.get("/health", z.unknown())).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("sends the access token of the current session", async () => {
    await apiClient.startSession(session("access-1", "refresh-1"));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await apiClient.get("/auth/me", z.unknown());
    expect(authorizationOf(0)).toBe("Bearer access-1");
  });

  it("refreshes an expired access token, then retries the request", async () => {
    await apiClient.startSession(session("access-1", "refresh-1"));
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(jsonResponse(200, session("access-2", "refresh-2")))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await expect(apiClient.get("/feed", z.object({ ok: z.boolean() }))).resolves.toEqual({
      ok: true,
    });
    expect(urlOf(1)).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ refreshToken: "refresh-1" }));
    expect(authorizationOf(2)).toBe("Bearer access-2");
    expect(await tokenStorage.getRefreshToken()).toBe("refresh-2");
  });

  it("refreshes only once for concurrent expired requests", async () => {
    await apiClient.startSession(session("access-1", "refresh-1"));
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/auth/refresh")) {
        return jsonResponse(200, session("access-2", "refresh-2"));
      }
      return authorizationIn(init) === "Bearer access-2" ? jsonResponse(200, {}) : expired();
    });

    await Promise.all([apiClient.get("/a", z.unknown()), apiClient.get("/b", z.unknown())]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("ends the session when the refresh token is rejected", async () => {
    await apiClient.startSession(session("access-1", "refresh-1"));
    const listener = jest.fn();
    const unsubscribe = apiClient.onSessionChange(listener);
    fetchMock
      .mockResolvedValueOnce(expired())
      .mockResolvedValueOnce(jsonResponse(401, { code: "INVALID_REFRESH_TOKEN", message: "no" }));

    await expect(apiClient.get("/feed", z.unknown())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(listener).toHaveBeenLastCalledWith(null);
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    unsubscribe();
  });
});
