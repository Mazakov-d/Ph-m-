import { screen } from "@testing-library/react-native";
import { tokenStorage } from "../lib/tokenStorage";
import { sessionFor } from "../test/fixtures";
import EditorProfileScreen from "../app/editors/[id]";
import { apiClient } from "../lib/apiClient";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11" }),
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));

const profile = {
  id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  pseudo: "Le Monde",
  editorStatus: "CERTIFIED",
  editorialLine: "Quotidien d'information générale.",
  ownerName: "Société éditrice du Monde",
  ownerGroup: null,
  reliability: "VERY_RELIABLE",
  donationUrl: "https://fr.tipeee.com/le-monde",
};

describe("EditorProfileScreen (SPEC §2.2)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the pseudo, badge, editorial line and owner, without identity", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, profile));
    await renderWithProviders(<EditorProfileScreen />);
    expect(await screen.findByText("Le Monde")).toBeTruthy();
    expect(screen.getByText("Certifié")).toBeTruthy();
    expect(screen.getByText("Quotidien d'information générale.")).toBeTruthy();
    expect(screen.queryByText("Identité")).toBeNull();
    // SPEC §5.7: the tier of the gauge, never a score.
    expect(screen.getByLabelText("Fiabilité de l'éditeur : Très fiable")).toBeTruthy();
    // docs/DECISIONS.md (donations): the reader sees where the link leads before leaving.
    expect(screen.getByText("Soutenir Le Monde")).toBeTruthy();
    expect(screen.getByText("Lien externe : fr.tipeee.com")).toBeTruthy();
  });

  it("shows the identity when the editor made it public", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ...profile, legalIdentity: { firstName: "Jeanne", lastName: "Durand" } }),
    );
    await renderWithProviders(<EditorProfileScreen />);
    expect(await screen.findByText("Jeanne Durand")).toBeTruthy();
  });

  it("says when the editor does not exist", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { code: "NOT_FOUND", message: "No such editor" }),
    );
    await renderWithProviders(<EditorProfileScreen />);
    expect(await screen.findByText("Cet éditeur n'existe pas.")).toBeTruthy();
  });

  it("shows the open chat beside the details to the moderator in charge (docs/DECISIONS.md)", async () => {
    const TICKET = "7c1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
    const now = new Date().toISOString();
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor("MODERATOR"));
      if (path.endsWith("/chat")) {
        return jsonResponse(200, {
          ticket: {
            id: TICKET,
            kind: "EDITOR_CHAT",
            status: "ASSIGNED",
            createdAt: now,
            lastMessageAt: now,
            openedById: profile.id,
            openedByPseudo: "Testeur",
            editorId: profile.id,
            editorPseudo: "Le Monde",
            assignedModeratorId: sessionFor("MODERATOR").user.id,
            assignedModeratorPseudo: "Testeur",
            assignedAt: now,
            firstMessage: "Bonjour",
            awaitingTeam: true,
          },
        });
      }
      if (path.endsWith(`/tickets/${TICKET}/messages`)) {
        return jsonResponse(200, [
          {
            id: "8c1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
            ticketId: TICKET,
            authorPseudo: "Testeur",
            fromTeam: true,
            authorRole: "MODERATOR",
            content: "Bonjour",
            createdAt: now,
          },
        ]);
      }
      if (path.includes("/posts")) return jsonResponse(200, { items: [], nextCursor: null });
      return jsonResponse(200, profile);
    });
    await renderWithProviders(<EditorProfileScreen />);
    expect(await screen.findByText("Conversation avec Le Monde")).toBeTruthy();
    expect(await screen.findByText(/^Modo · /)).toBeTruthy();
  });
});
