import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AccountScreen from "../app/(tabs)/account";
import ModeratorsScreen from "../app/admin/moderators";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/account",
  Stack: { Screen: () => null },
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
}));

const now = new Date().toISOString();
const moderator = {
  id: "5d1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  pseudo: "nouveau-modo",
  email: "nouveau@pheme.fr",
  createdAt: now,
};

describe("the dashboard and the moderators (docs/DECISIONS.md)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    mockPush.mockReset();
    await apiClient.endSession();
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
  });

  it("lets an admin add a moderator with « + Modérateur »", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor("ADMIN"));
      if (init?.method === "POST") return jsonResponse(201, moderator);
      return jsonResponse(200, []);
    });
    await renderWithProviders(<ModeratorsScreen />);
    expect(await screen.findByText("Aucun modérateur pour l'instant.")).toBeTruthy();
    await fireEvent.press(screen.getByText("+ Modérateur"));
    await fireEvent.changeText(screen.getByLabelText("Pseudo"), "nouveau-modo");
    await fireEvent.changeText(screen.getByLabelText("Adresse e-mail"), "nouveau@pheme.fr");
    await fireEvent.changeText(
      screen.getByLabelText("Mot de passe (12 caractères au moins)"),
      "un-mot-de-passe-solide",
    );
    await fireEvent.press(screen.getByText("Créer le compte modérateur"));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/admin/moderators") && init?.method === "POST",
      );
      const body = call?.[1]?.body;
      expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
        pseudo: "nouveau-modo",
        email: "nouveau@pheme.fr",
        password: "un-mot-de-passe-solide",
      });
    });
    await waitFor(() => expect(screen.queryByText("Créer le compte modérateur")).toBeNull());
  });

  it("unfolds the team's tools under the dashboard's buttons", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor("ADMIN"))
        : jsonResponse(200, []),
    );
    await renderWithProviders(<AccountScreen />);
    // Signing out and deleting the account are always there.
    expect(await screen.findByText("Se déconnecter")).toBeTruthy();
    expect(screen.getByText("Supprimer mon compte")).toBeTruthy();
    expect(screen.queryByText("Modérateurs")).toBeNull();

    await fireEvent.press(screen.getByText("Administration"));
    await fireEvent.press(screen.getByText("Modérateurs"));
    expect(mockPush).toHaveBeenCalledWith("/admin/moderators");
    // One section at a time: opening « Modération » folds « Administration ».
    await fireEvent.press(screen.getByText("Modération"));
    expect(screen.getByText("Articles signalés")).toBeTruthy();
    expect(screen.queryByText("Modérateurs")).toBeNull();
    await fireEvent.press(screen.getByText("Modération"));
    expect(screen.queryByText("Articles signalés")).toBeNull();

    await fireEvent.press(screen.getByText("Conversations"));
    expect(await screen.findByText("Toutes les conversations")).toBeTruthy();
  });

  it("gives no Administration to a moderator, nor « Devenir éditeur »", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor("MODERATOR"))
        : jsonResponse(200, []),
    );
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText("Conversations")).toBeTruthy();
    expect(screen.queryByText("Administration")).toBeNull();
    expect(screen.queryByText("Devenir éditeur")).toBeNull();
  });

  it("gives a reader the same buttons, and unfolds the account's deletion", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor("READER"))
        : jsonResponse(200, { volunteer: false }),
    );
    await renderWithProviders(<AccountScreen />);
    await fireEvent.press(await screen.findByText("Devenir éditeur"));
    expect(mockPush).toHaveBeenCalledWith("/editor");
    expect(screen.getByText("Contacter Phémé")).toBeTruthy();
    expect(screen.queryByText("Conversations")).toBeNull();
    await fireEvent.press(screen.getByText("Supprimer mon compte"));
    expect(screen.getByText(/signés « Compte supprimé »/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Annuler"));
    expect(screen.queryByText(/signés « Compte supprimé »/)).toBeNull();
  });
});
