import type { PostPublic } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { ARTICLE_DETAIL, sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { ReportButton } from "../components/ReportButton";

describe("ReportButton (SPEC §5.1)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const reportCalls = () =>
    fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/reports"));

  async function renderButton(post: PostPublic, session = sessionFor("READER")) {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, session)
        : jsonResponse(201, { id: post.id, reason: "OTHER", createdAt: post.createdAt }),
    );
    await renderWithProviders(<ReportButton post={post} />);
    // Let the session be restored.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("sends a report with a reason, details required for « Autre »", async () => {
    await renderButton(ARTICLE_DETAIL);
    await fireEvent.press(await screen.findByText("Signaler"));
    await fireEvent.press(screen.getByText("Autre"));
    await fireEvent.press(screen.getByText("Envoyer le signalement"));
    expect(await screen.findByText("Expliquez le problème en quelques mots.")).toBeTruthy();
    expect(reportCalls()).toHaveLength(0);

    await fireEvent.changeText(
      screen.getByLabelText("Précisez (obligatoire pour « Autre »)"),
      "Photo d'un autre événement",
    );
    await fireEvent.press(screen.getByText("Envoyer le signalement"));
    await waitFor(() => expect(reportCalls()).toHaveLength(1));
    const body = reportCalls()[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      reason: "OTHER",
      details: "Photo d'un autre événement",
    });
  });

  it("says when the reader already reported the post", async () => {
    await renderButton({ ...ARTICLE_DETAIL, viewerHasReported: true });
    expect(await screen.findByText("Vous avez signalé cette publication.")).toBeTruthy();
    expect(screen.queryByText("Signaler")).toBeNull();
  });

  it("is hidden on a reviewed article and on one's own post", async () => {
    await renderButton({ ...ARTICLE_DETAIL, reviewStatus: "REVIEWED", verdict: "FALSE" });
    expect(screen.queryByText("Signaler")).toBeNull();
    await apiClient.endSession();
    const own = {
      ...ARTICLE_DETAIL,
      editor: { ...ARTICLE_DETAIL.editor, id: sessionFor("EDITOR").user.id },
    };
    await renderButton(own, sessionFor("EDITOR", "INDEPENDENT"));
    expect(screen.queryByText("Signaler")).toBeNull();
  });

  it("is hidden for an anonymous visitor", async () => {
    await renderWithProviders(<ReportButton post={ARTICLE_DETAIL} />);
    expect(screen.queryByText("Signaler")).toBeNull();
  });
});
