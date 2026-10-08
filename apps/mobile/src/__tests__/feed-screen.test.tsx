import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import FeedScreen from "../app/(tabs)/index";
import { apiClient } from "../lib/apiClient";
import { ARTICLE_CARD, OPINION_CARD } from "../test/fixtures";
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
    expect(screen.getByText("Lieu")).toBeTruthy();
    expect(screen.getByText("Thème")).toBeTruthy();
    await fireEvent.press(screen.getByText("▸ Villes"));
    await fireEvent.press(screen.getByText("Lyon"));
    await fireEvent.press(screen.getByText("Autre"));
    await fireEvent.press(screen.getByText("Masquer les filtres"));

    expect(screen.queryByText("Période")).toBeNull();
    expect(screen.getByText(/Filtres : Lyon · Autre/)).toBeTruthy();
  });

  it("asks for the weighted draw « À la une », with the reader's seed (SPEC §4.2)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    await fireEvent(screen.getByLabelText(SEARCH_LABEL), "focus");
    await fireEvent.press(screen.getByText("À la une"));
    await waitFor(() => expect(feedCalls().at(-1)).toMatch(/\/posts\?sort=WEIGHTED&seed=[\w-]+$/));
    await fireEvent.press(screen.getByText("Masquer les filtres"));
    expect(screen.getByText(/Filtres : À la une/)).toBeTruthy();
  });

  it("closes the filters with a press outside them (interface brief)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, feedPage));
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    await fireEvent(screen.getByLabelText(SEARCH_LABEL), "focus");
    expect(screen.getByText("Période")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Fermer les filtres"));
    expect(screen.queryByText("Période")).toBeNull();
  });

  it("shows the still image of the video, with its duration, on a card (docs/DECISIONS.md)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [
          {
            ...ARTICLE_CARD,
            layout: "MEDIA_FIRST",
            bodyExcerpt: null,
            video: {
              path: "/posts/1/video",
              posterPath: "/posts/1/video/poster",
              durationSeconds: 65,
            },
          },
        ],
        nextCursor: null,
      }),
    );
    await renderWithProviders(<FeedScreen />);
    expect(await screen.findByLabelText("Vidéo de 1:05")).toBeTruthy();
  });

  it("shows the start of the article on a card whose third block is the text", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [{ ...ARTICLE_CARD, bodyExcerpt: "Le texte *commence* ainsi…" }],
        nextCursor: null,
      }),
    );
    await renderWithProviders(<FeedScreen />);
    expect(await screen.findByText("commence")).toHaveStyle({
      fontFamily: "merriweather-400-italic",
    });
  });
});
