import type { SearchResultsPublic } from "@fama/shared";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import FeedScreen from "../../../app/(tabs)/index";
import { apiClient } from "../../../lib/apiClient";
import { ARTICLE_CARD } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => ReactNode } }) =>
      options?.headerRight?.() ?? null,
  },
}));

const results: SearchResultsPublic = {
  editors: [{ id: ARTICLE_CARD.editor.id, pseudo: "Le Monde", editorStatus: "CERTIFIED" }],
  posts: [{ ...ARTICLE_CARD, title: "Climat : le sommet européen" }],
};

describe("search on the feed (SPEC §4.4)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const searchCalls = () =>
    fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes("/search?"));

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
    fetchMock.mockImplementation(async (url) =>
      String(url).includes("/search?")
        ? jsonResponse(200, results)
        : jsonResponse(200, { items: [ARTICLE_CARD], nextCursor: null }),
    );
  });

  it("shows editors and posts found, with the feed's filters", async () => {
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    // Interface brief: the filters show once the search bar is touched.
    await fireEvent(screen.getByLabelText("Rechercher un média, un titre, un sujet…"), "focus");
    await fireEvent.press(screen.getByText("Europe"));
    await fireEvent.changeText(
      screen.getByLabelText("Rechercher un média, un titre, un sujet…"),
      "le mond",
    );

    expect(await screen.findByText("Médias et éditeurs")).toBeTruthy();
    expect(screen.getAllByText("Le Monde")).toHaveLength(2); // the editor found, and the author of the post
    expect(screen.getByText("Climat : le sommet européen")).toBeTruthy();
    expect(searchCalls().at(-1)).toMatch(/\/search\?q=le\+mond&zone=EUROPE$/);
  });

  it("does not search below 2 characters and comes back to the feed when cleared", async () => {
    await renderWithProviders(<FeedScreen />);
    await screen.findByText("Le budget adopté");
    await fireEvent.changeText(
      screen.getByLabelText("Rechercher un média, un titre, un sujet…"),
      "l",
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(searchCalls()).toHaveLength(0);

    await fireEvent.changeText(
      screen.getByLabelText("Rechercher un média, un titre, un sujet…"),
      "climat",
    );
    await screen.findByText("Climat : le sommet européen");
    await fireEvent.press(screen.getByLabelText("Effacer la recherche"));
    await waitFor(() => expect(screen.getByText("Le budget adopté")).toBeTruthy());
  });
});
