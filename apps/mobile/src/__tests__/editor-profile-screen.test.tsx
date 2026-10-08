import { screen } from "@testing-library/react-native";
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
});
