import type { AppealModeration, ReviewQueueItemModeration } from "@fama/shared";
import { fireEvent, screen } from "@testing-library/react-native";
import PostReviewsScreen from "../app/moderation/post-reviews/index";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { ARTICLE_CARD, sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));

const queueItem: ReviewQueueItemModeration = {
  post: { ...ARTICLE_CARD, reviewStatus: "UNDER_REVIEW", reportCount: 2 },
  viewCount: 90,
  score: 5.2,
  priority: 10.4,
  reports: [
    {
      id: "ee1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      reporterId: "ff1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      reason: "OUT_OF_CONTEXT_MEDIA",
      details: "Photo de 2019",
      weight: 1,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
  ],
};

const appeal: AppealModeration = {
  id: "ab1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  post: ARTICLE_CARD,
  review: {
    id: "ac1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    postId: ARTICLE_CARD.id,
    verdict: "FALSE",
    publicNote: "Chiffres erronés.",
    sources: ["https://www.insee.fr"],
    createdAt: new Date().toISOString(),
    editorReply: null,
    appealState: "PENDING",
  },
  reviewModeratorId: "ad1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  reason: "Notre source est officielle.",
  createdAt: new Date().toISOString(),
};

describe("PostReviewsScreen (SPEC §5.4)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("lists the queue with priorities and reports, then the appeals", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor("MODERATOR"));
      if (path.endsWith("/moderation/appeals")) return jsonResponse(200, [appeal]);
      return jsonResponse(200, [queueItem]);
    });
    await renderWithProviders(<PostReviewsScreen />);

    expect(await screen.findByText("Priorité 10.4")).toBeTruthy();
    expect(screen.getByText(/Image hors contexte : Photo de 2019/)).toBeTruthy();
    expect(screen.getByText("Rendre un verdict")).toBeTruthy();

    await fireEvent.press(screen.getByText("Appels (1)"));
    expect(screen.getByText("Verdict contesté : faux")).toBeTruthy();
    expect(screen.getByText("Notre source est officielle.")).toBeTruthy();
  });

  it("is reserved to moderators", async () => {
    await renderWithProviders(<PostReviewsScreen />);
    expect(await screen.findByText("Cet écran est réservé à l'équipe de modération.")).toBeTruthy();
  });
});
