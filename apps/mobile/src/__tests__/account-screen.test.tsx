import { APP_NAME } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AccountScreen from "../app/(tabs)/account";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/account",
  Stack: { Screen: () => null },
  // A link is a Text in React Native.
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
}));

describe("AccountScreen", () => {
  beforeEach(async () => {
    await apiClient.endSession();
  });

  it("opens the sign-in and sign-up forms in the account box (interface brief)", async () => {
    await renderWithProviders(<AccountScreen />);
    await fireEvent.press(await screen.findByText("Se connecter"));
    expect(screen.getByLabelText("Adresse e-mail")).toBeTruthy();
    expect(screen.getByRole("header", { name: "La rumeur, sourcée." })).toBeTruthy();

    await fireEvent.press(screen.getByText("Pas encore de compte ? En créer un"));
    expect(screen.getByLabelText("Pseudo (affiché sur vos commentaires)")).toBeTruthy();
    await fireEvent.press(screen.getByText("Déjà un compte ? Se connecter"));
    expect(screen.queryByLabelText("Pseudo (affiché sur vos commentaires)")).toBeNull();
  });

  it("offers to sign in or sign up when anonymous", async () => {
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText("Se connecter")).toBeTruthy();
    expect(screen.getByText("Créer un compte")).toBeTruthy();
    expect(APP_NAME).toBe("Phémé");
    // Interface brief: the slogan heads the account box of a visitor.
    expect(screen.getByRole("header", { name: "La rumeur, sourcée." })).toBeTruthy();
    // SPEC §10: the static pages are reachable without an account.
    expect(screen.getByText("Politique de confidentialité")).toBeTruthy();
  });

  it("lets a moderator take a conversation in charge from the account (docs/DECISIONS.md)", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    const TICKET = "9d1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
    const now = new Date().toISOString();
    const waiting = {
      id: TICKET,
      kind: "SUPPORT",
      status: "NEW",
      createdAt: now,
      lastMessageAt: now,
      openedById: "1d1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      openedByPseudo: "lecteur",
      editorId: null,
      editorPseudo: null,
      assignedModeratorId: null,
      assignedModeratorPseudo: null,
      assignedAt: null,
      firstMessage: "Mon compte a été suspendu à tort.",
      awaitingTeam: true,
    };
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor("MODERATOR"));
      if (path.endsWith("/assign") && init?.method === "POST") {
        return jsonResponse(200, { ...waiting, status: "ASSIGNED" });
      }
      if (path.endsWith("scope=unassigned")) return jsonResponse(200, [waiting]);
      return jsonResponse(200, []);
    });
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText("Mon compte a été suspendu à tort.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Prendre en charge"));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).endsWith(`/moderation/tickets/${TICKET}/assign`),
        ),
      ).toBe(true),
    );
    fetchMock.mockRestore();
  });
});
