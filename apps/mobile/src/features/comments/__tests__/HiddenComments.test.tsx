import { fireEvent, screen } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { ARTICLE_DETAIL } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { HiddenComments } from "../components/HiddenComments";

jest.mock("expo-router", () => ({ Link: () => null }));

describe("HiddenComments (docs/DECISIONS.md)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("loads and shows the comments only on demand", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], nextCursor: null }));
    const post = { ...ARTICLE_DETAIL, commentCount: 4 };
    await renderWithProviders(<HiddenComments post={post} />);
    expect(screen.queryByText(/^Commentaires · /)).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/comments"))).toBe(false);

    await fireEvent.press(screen.getByText("Afficher les commentaires (4)"));
    expect(screen.getByText(/^Commentaires · /)).toBeTruthy();
    await fireEvent.press(screen.getByText("Masquer les commentaires"));
    expect(screen.queryByText(/^Commentaires · /)).toBeNull();
  });
});
