import type { AuthSession } from "@fama/shared";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { apiClient } from "../../lib/apiClient";
import { tokenStorage } from "../../lib/tokenStorage";
import { AuthProvider, useAuth } from "../AuthProvider";
import { createQueryClient, QueryProvider } from "../QueryProvider";

const session: AuthSession = {
  user: {
    id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    email: "lea@test.fr",
    pseudo: "Léa",
    role: "READER",
    editorStatus: null,
    suspendedUntil: null,
    bannedAt: null,
  },
  tokens: { accessToken: "access", refreshToken: "refresh" },
};

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function Probe() {
  const { status, user, signIn, signOut } = useAuth();
  return (
    <View>
      <Text>{`status:${status}`}</Text>
      <Text>{`user:${user?.pseudo ?? "none"}`}</Text>
      <Pressable onPress={() => signIn({ email: "lea@test.fr", password: "x" })}>
        <Text>sign-in</Text>
      </Pressable>
      <Pressable onPress={() => signOut()}>
        <Text>sign-out</Text>
      </Pressable>
    </View>
  );
}

function renderWithProviders(client = createQueryClient({ gcTime: Infinity })) {
  return render(
    <QueryProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryProvider>,
  );
}

describe("AuthProvider", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("is anonymous at start without a stored session", async () => {
    await renderWithProviders();
    expect(await screen.findByText("status:anonymous")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores the session kept from a previous launch", async () => {
    await tokenStorage.save(session.tokens);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
    await renderWithProviders();
    expect(await screen.findByText("status:authenticated")).toBeTruthy();
    expect(screen.getByText("user:Léa")).toBeTruthy();
  });

  it("signs in, then signs out and forgets the session", async () => {
    await renderWithProviders();
    await screen.findByText("status:anonymous");

    fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
    await fireEvent.press(screen.getByText("sign-in"));
    expect(await screen.findByText("user:Léa")).toBeTruthy();
    expect(await tokenStorage.getRefreshToken()).toBe("refresh");

    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await fireEvent.press(screen.getByText("sign-out"));
    expect(await screen.findByText("status:anonymous")).toBeTruthy();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it("keeps the cached data when an anonymous visitor's session check fails", async () => {
    // A stale refresh token is rejected at start: the visitor is anonymous, nothing was cached
    // for an account, and the requests already in flight must survive.
    await tokenStorage.save(session.tokens);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { code: "INVALID_REFRESH_TOKEN", message: "no" }),
    );
    const client = createQueryClient({ gcTime: Infinity });
    const clear = jest.spyOn(client, "clear");
    await renderWithProviders(client);
    await screen.findByText("status:anonymous");
    expect(clear).not.toHaveBeenCalled();
  });

  it("clears the cached data when the signed-in user signs out", async () => {
    const client = createQueryClient({ gcTime: Infinity });
    const clear = jest.spyOn(client, "clear");
    await renderWithProviders(client);
    await screen.findByText("status:anonymous");

    fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
    await fireEvent.press(screen.getByText("sign-in"));
    await screen.findByText("status:authenticated");
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await fireEvent.press(screen.getByText("sign-out"));
    await screen.findByText("status:anonymous");
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("requires the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow("useAuth must be used inside <AuthProvider>");
  });
});
