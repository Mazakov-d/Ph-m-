import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import JuryScreen from "../app/jury";
import { apiClient } from "../lib/apiClient";
import { ARTICLE_CARD } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));

const SEAT_ID = "9c1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const seat = {
  id: SEAT_ID,
  post: ARTICLE_CARD,
  status: "PENDING",
  deadline: new Date(Date.now() + 40 * 3_600_000).toISOString(),
  vote: null,
};

describe("JuryScreen (SPEC §5.8)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const votes = () =>
    fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith(`/jury/assignments/${SEAT_ID}/vote`),
    );

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the article to examine and sends a verdict with its source", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/vote") ? jsonResponse(204) : jsonResponse(200, [seat]),
    );
    await renderWithProviders(<JuryScreen />);
    expect(await screen.findByText("Le budget adopté")).toBeTruthy();
    expect(screen.getByText(/^À voter avant le /)).toBeTruthy();

    await fireEvent.press(screen.getByText("trompeur"));
    await fireEvent.changeText(
      screen.getByLabelText("Source qui l'appuie (lien ou référence, obligatoire)"),
      "https://www.insee.fr",
    );
    await fireEvent.press(screen.getByText("Envoyer mon vote"));
    await waitFor(() => expect(votes()).toHaveLength(1));
    const body = votes()[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      verdict: "MISLEADING",
      source: "https://www.insee.fr",
      note: null,
    });
  });

  it("shows the vote already cast", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        { ...seat, status: "VOTED", vote: { verdict: "FALSE", source: "Source", note: null } },
      ]),
    );
    await renderWithProviders(<JuryScreen />);
    expect(await screen.findByText("Votre vote : faux")).toBeTruthy();
    expect(screen.queryByText("Envoyer mon vote")).toBeNull();
  });
});
