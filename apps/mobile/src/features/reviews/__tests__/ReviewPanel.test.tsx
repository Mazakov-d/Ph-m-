import type { PostPublic, ReviewPublic } from "@fama/shared";
import { fireEvent, screen } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { ARTICLE_DETAIL, sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { ReviewPanel } from "../components/ReviewPanel";

const HOUR = 60 * 60 * 1000;
const reviewed: PostPublic = {
  ...ARTICLE_DETAIL,
  reviewStatus: "REVIEWED",
  verdict: "FALSE",
  reportCount: 7,
};

function review(hoursAgo: number, overrides: Partial<ReviewPublic> = {}): ReviewPublic {
  return {
    id: "dd1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    postId: reviewed.id,
    verdict: "FALSE",
    publicNote: "Les chiffres ne correspondent pas à la source.",
    sources: ["https://www.insee.fr"],
    createdAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
    editorReply: null,
    appealState: "NONE",
    ...overrides,
  };
}

describe("ReviewPanel (SPEC §5.6)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  async function renderPanel(data: ReviewPublic, asAuthor: boolean) {
    if (asAuthor) {
      await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    }
    const author = sessionFor("EDITOR", "INDEPENDENT");
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh") ? jsonResponse(200, author) : jsonResponse(200, data),
    );
    const post = asAuthor
      ? { ...reviewed, editor: { ...reviewed.editor, id: author.user.id } }
      : reviewed;
    await renderWithProviders(<ReviewPanel post={post} />);
    await fireEvent.press(await screen.findByText("Pourquoi ?"));
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the verdict, the note, the sources and the editor's reply", async () => {
    await renderPanel(
      review(2, {
        editorReply: {
          content: "Nos chiffres datent de 2024.",
          createdAt: new Date().toISOString(),
        },
      }),
      false,
    );
    expect(await screen.findByText(/^Examiné par la modération : faux/)).toBeTruthy();
    expect(screen.getByText("Les chiffres ne correspondent pas à la source.")).toBeTruthy();
    expect(screen.getByText("https://www.insee.fr")).toBeTruthy();
    expect(screen.getByText("Nos chiffres datent de 2024.")).toBeTruthy();
    expect(screen.queryByText("Faire appel")).toBeNull();
  });

  it("offers the author to reply, correct and appeal within 48 hours", async () => {
    await renderPanel(review(2), true);
    expect(await screen.findByText("Répondre au verdict")).toBeTruthy();
    expect(screen.getByText("Publier une correction")).toBeTruthy();
    expect(screen.getByText("Faire appel")).toBeTruthy();
  });

  it("offers nothing more after 48 hours", async () => {
    await renderPanel(review(49), true);
    await screen.findByText(/^Examiné par la modération/);
    expect(screen.queryByText("Répondre au verdict")).toBeNull();
    expect(screen.queryByText("Faire appel")).toBeNull();
  });

  it("shows a pending appeal and no second appeal", async () => {
    await renderPanel(review(2, { appealState: "PENDING" }), true);
    expect(
      await screen.findByText("L'éditeur a fait appel : un autre modérateur réexamine l'article."),
    ).toBeTruthy();
    expect(screen.queryByText("Faire appel")).toBeNull();
  });

  it("is absent for an article not reviewed", async () => {
    await renderWithProviders(<ReviewPanel post={ARTICLE_DETAIL} />);
    expect(screen.queryByText("Pourquoi ?")).toBeNull();
  });
});
