import type { CommentModeration, SanctionAppealModeration, SanctionPublic } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import BlocksScreen from "../app/blocks";
import ContentModerationScreen from "../app/moderation/comments";
import SanctionsScreen from "../app/sanctions";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({ Stack: { Screen: () => null } }));

const ID = (n: number) => `${n}${n}1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11`;
const now = new Date().toISOString();

const comment: CommentModeration = {
  id: ID(1),
  postId: ID(2),
  parentId: null,
  authorId: ID(3),
  authorPseudo: "auteur",
  content: "Propos insultants",
  status: "UNDER_REVIEW",
  createdAt: now,
  reportCount: 3,
  totalReportWeight: 3,
  reports: [
    {
      id: ID(4),
      reporterId: ID(5),
      reason: "INSULT",
      details: null,
      weight: 1,
      status: "PENDING",
      createdAt: now,
    },
  ],
};
const sanction: SanctionPublic = {
  id: ID(6),
  type: "SUSPENSION_24H",
  commentId: ID(1),
  postId: null,
  createdAt: now,
  endsAt: new Date(Date.now() + 3_600_000).toISOString(),
  appealState: "NONE",
  liftedAt: null,
};
const appeal: SanctionAppealModeration = {
  id: ID(7),
  sanction: { ...sanction, appealState: "PENDING" },
  sanctionedPseudo: "auteur",
  sanctionModeratorId: ID(8),
  content: "Propos insultants",
  reason: "C'était de l'ironie.",
  createdAt: now,
};

describe("moderation, sanctions and blocks screens", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const bodyOf = (suffix: string) => {
    const body = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith(suffix) && init?.method === "POST",
    )?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : undefined;
  };

  async function signIn(role: "MODERATOR" | "READER", answer: (path: string) => unknown) {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor(role));
      if (init?.method === "DELETE") return jsonResponse(204);
      return jsonResponse(200, answer(path));
    });
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("removes a comment with the discrimination and PHAROS boxes (SPEC §6.3)", async () => {
    await signIn("MODERATOR", (path) =>
      path.endsWith("/moderation/comments")
        ? [comment]
        : path.endsWith("/decision")
          ? { sanction: null }
          : [],
    );
    await renderWithProviders(<ContentModerationScreen />);
    expect(await screen.findByText("Propos insultants")).toBeTruthy();
    expect(screen.getByText("• Insulte")).toBeTruthy();

    await fireEvent.press(screen.getByText("Retirer"));
    await fireEvent(
      screen.getByLabelText("Discrimination confirmée (bannissement immédiat)"),
      "valueChange",
      true,
    );
    await fireEvent(screen.getByLabelText("À signaler sur PHAROS"), "valueChange", true);
    await fireEvent.press(screen.getByText("Confirmer le retrait"));
    await waitFor(() =>
      expect(bodyOf(`/moderation/comments/${ID(1)}/decision`)).toEqual({
        decision: "REMOVED",
        isDiscrimination: true,
        reportToPharos: true,
      }),
    );
  });

  it("decides a sanction appeal", async () => {
    await signIn("MODERATOR", (path) =>
      path.endsWith("/moderation/sanction-appeals")
        ? [appeal]
        : path.endsWith("/decision")
          ? appeal.sanction
          : [],
    );
    await renderWithProviders(<ContentModerationScreen />);
    await fireEvent.press(await screen.findByText("Contestations (1)"));
    expect(screen.getByText("Contestation : C'était de l'ironie.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Lever la sanction"));
    await waitFor(() =>
      expect(bodyOf(`/moderation/sanction-appeals/${ID(7)}/decision`)).toEqual({ accepted: true }),
    );
  });

  it("lists the user's sanctions and lets them appeal once", async () => {
    await signIn("READER", (path) => (path.endsWith("/sanctions/me") ? [sanction] : sanction));
    await renderWithProviders(<SanctionsScreen />);
    expect(await screen.findByText("Suspension de 24 heures")).toBeTruthy();
    await fireEvent.press(screen.getByText("Contester cette sanction"));
    await fireEvent.changeText(
      screen.getByLabelText("Contester cette sanction"),
      "C'était de l'ironie.",
    );
    await fireEvent.press(screen.getByText("Envoyer la contestation"));
    await waitFor(() =>
      expect(bodyOf(`/sanctions/${ID(6)}/appeal`)).toEqual({ reason: "C'était de l'ironie." }),
    );
  });

  it("unblocks a blocked account (SPEC §10)", async () => {
    await signIn("READER", () => [
      { blockedUserId: ID(3), blockedPseudo: "auteur", createdAt: now },
    ]);
    await renderWithProviders(<BlocksScreen />);
    expect(await screen.findByText("auteur")).toBeTruthy();
    await fireEvent.press(screen.getByText("Débloquer"));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).endsWith(`/users/${ID(3)}/block`) && init?.method === "DELETE",
        ),
      ).toBe(true),
    );
  });
});
