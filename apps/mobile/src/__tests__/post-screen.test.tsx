import { fireEvent, screen } from "@testing-library/react-native";
import PostScreen from "../app/posts/[id]";
import { apiClient } from "../lib/apiClient";
import { ARTICLE_DETAIL, OPINION_CARD } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ id: "1b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11" }),
  // A link is a Text in React Native.
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
  Stack: { Screen: () => null },
}));

describe("PostScreen", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the full post with its place, sources and reliability", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ARTICLE_DETAIL));
    await renderWithProviders(<PostScreen />);

    expect(await screen.findByText("Texte complet de l'article.")).toBeTruthy();
    expect(screen.getByText("Local · Bretagne · Politique")).toBeTruthy();
    expect(screen.getByLabelText("Fiabilité de l'éditeur : Fiable")).toBeTruthy();
    expect(screen.getByText("Non examiné")).toBeTruthy();
    // Interface brief: under the article, the sources on the left, then the status on the right.
    const tree = JSON.stringify(screen.toJSON());
    const body = tree.indexOf("Texte complet de l'article.");
    const sources = tree.indexOf("Sources (2)");
    const status = tree.indexOf("Non examiné");
    expect(body).toBeLessThan(sources);
    expect(sources).toBeLessThan(status);
    // Interface brief: the sources stay folded until « Sources » is pressed.
    expect(screen.queryByText("https://www.insee.fr")).toBeNull();
    await fireEvent.press(screen.getByText("Sources (2)"));
    expect(screen.getByText("https://www.insee.fr")).toBeTruthy();
    expect(screen.getByText("Compte rendu de séance")).toBeTruthy();
  });

  it("shows the pictures before the article when the editor chose so, with bold words", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ...ARTICLE_DETAIL,
        body: "Un vote **serré** hier.",
        layout: "MEDIA_FIRST",
      }),
    );
    await renderWithProviders(<PostScreen />);

    const bold = await screen.findByText("serré");
    // The body of ARTICLE_DETAIL is in Merriweather (SERIF): its bold words use the bold font.
    expect(bold).toHaveStyle({ fontFamily: "merriweather-700-normal" });
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("tells how many other media talk about it and lists them on demand (SPEC §9)", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/similar")
        ? jsonResponse(200, { otherMediaCount: 2, posts: [OPINION_CARD] })
        : jsonResponse(200, ARTICLE_DETAIL),
    );
    await renderWithProviders(<PostScreen />);

    expect(await screen.findByText("2 autres médias en parlent")).toBeTruthy();
    expect(screen.queryByText("Faut-il rouvrir le débat ?")).toBeNull();
    await fireEvent.press(screen.getByText("Voir les similaires"));
    expect(screen.getByText("Faut-il rouvrir le débat ?")).toBeTruthy();
  });

  it("says when the post does not exist", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { code: "NOT_FOUND", message: "No such post" }),
    );
    await renderWithProviders(<PostScreen />);
    expect(await screen.findByText("Cette publication n'existe pas.")).toBeTruthy();
  });
});
