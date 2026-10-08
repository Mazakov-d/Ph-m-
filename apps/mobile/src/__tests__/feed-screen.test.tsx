import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import FeedScreen from "../app/index";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { ARTICLE_CARD, OPINION_CARD, sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  // Renders the header buttons so the test can see them.
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => ReactNode } }) =>
      options?.headerRight?.() ?? null,
  },
}));

const feedPage = { items: [ARTICLE_CARD, OPINION_CARD], nextCursor: null };
const SEARCH_LABEL = "Rechercher un média, un titre, un sujet…";

describe("FeedScreen (SPEC §4)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const feedCalls = () =>
    fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes("/posts"));

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the feed to an anonymous visitor (SPEC §2)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);

    expect(await screen.findByText("Le budget adopté")).toBeTruthy();
    expect(screen.getByText("Faut-il rouvrir le débat ?")).toBeTruthy();
    // SPEC §5.6: reliability bar for the article, « Opinion » label for the opinion.
    expect(screen.getByText("Non examiné")).toBeTruthy();
    expect(screen.getByText("Opinion")).toBeTruthy();
    expect(screen.getByText("2 commentaires")).toBeTruthy();
    expect(screen.getAllByText("Certifié").length).toBe(2);
    expect(screen.getAllByText("il y a 2 h")).toHaveLength(2);
  });

  it("hides « Publier » from a visitor and shows « Compte »", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    expect(screen.getByText("Compte")).toBeTruthy();
    expect(screen.queryByText("Publier")).toBeNull();
  });

  it("shows « Publier » to a validated editor", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor("EDITOR", "INDEPENDENT"))
        : jsonResponse(200, feedPage),
    );
    await renderWithProviders(<FeedScreen />);
    expect(await screen.findByText("Publier")).toBeTruthy();
  });

  it("reloads the feed with the chosen filters", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    await fireEvent(screen.getByLabelText(SEARCH_LABEL), "focus");

    await fireEvent.press(screen.getByText("Aujourd'hui"));
    await fireEvent.press(screen.getByText("Europe"));
    await fireEvent.press(screen.getByText("Tech"));
    await waitFor(() =>
      expect(feedCalls().at(-1)).toMatch(/\/posts\?today=true&zone=EUROPE&theme=TECH$/),
    );
  });

  it("shows the filters only once the search bar is touched, then reminds the active ones", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    expect(screen.queryByText("Aujourd'hui")).toBeNull();

    await fireEvent(screen.getByLabelText(SEARCH_LABEL), "focus");
    expect(screen.getByText("Période")).toBeTruthy();
    expect(screen.getByText("Zone")).toBeTruthy();
    expect(screen.getByText("Thème")).toBeTruthy();
    await fireEvent.press(screen.getByText("Local"));
    await fireEvent.press(screen.getByText("Autre"));
    await fireEvent.press(screen.getByText("Masquer les filtres"));

    expect(screen.queryByText("Période")).toBeNull();
    expect(screen.getByText(/Filtres : Local · Autre/)).toBeTruthy();
  });

  it("shows the start of the article on a card whose third block is the text", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [{ ...ARTICLE_CARD, bodyExcerpt: "Le texte *commence* ainsi…" }],
        nextCursor: null,
      }),
    );
    await renderWithProviders(<FeedScreen />);
    expect(await screen.findByText("commence")).toHaveStyle({ fontStyle: "italic" });
  });
});
