import type { PostPublic, VoteSummaryPublic } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { ARTICLE_DETAIL, sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { VoteBar } from "../components/VoteBar";

jest.mock("expo-router", () => ({
  // A link is a Text in React Native.
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
}));

const YES = "aa1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const NO = "bb1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const MAYBE = "cc1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const options = [
  { id: YES, label: "Oui" },
  { id: NO, label: "Non" },
  { id: MAYBE, label: "Sans avis" },
];
const hidden: VoteSummaryPublic = {
  options,
  myOptionId: null,
  revealedResults: false,
  results: null,
};
const afterVote: VoteSummaryPublic = {
  options,
  myOptionId: YES,
  revealedResults: false,
  results: {
    totalVotes: 128,
    counts: [
      { optionId: YES, count: 79 },
      { optionId: NO, count: 40 },
      { optionId: MAYBE, count: 9 },
    ],
  },
};
const opinion = (votes: VoteSummaryPublic): PostPublic => ({
  ...ARTICLE_DETAIL,
  kind: "OPINION",
  votes,
});

describe("VoteBar (SPEC §7)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const bodyOf = (method: string) => {
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === method);
    const body = call?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : undefined;
  };

  async function renderBar(votes: VoteSummaryPublic, { signedIn }: { signedIn: boolean }) {
    if (signedIn) {
      await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    }
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor("READER"))
        : jsonResponse(200, afterVote),
    );
    await renderWithProviders(<VoteBar post={opinion(votes)} />);
    if (signedIn) {
      // Wait for the session to be restored (results visible, or the reveal link).
      await screen.findByText(votes.results ? "✓ Oui" : "Voir sans voter");
    }
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the choices but no result before voting", async () => {
    await renderBar(hidden, { signedIn: true });
    expect(screen.getByText("Oui")).toBeTruthy();
    expect(screen.getByText("Sans avis")).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("votes for a choice", async () => {
    await renderBar(hidden, { signedIn: true });
    await fireEvent.press(screen.getByText("Non"));
    await waitFor(() => expect(bodyOf("PUT")).toEqual({ optionId: NO }));
  });

  it("reveals the results without voting", async () => {
    await renderBar(hidden, { signedIn: true });
    await fireEvent.press(screen.getByText("Voir sans voter"));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/vote/reveal"))).toBe(true),
    );
  });

  it("shows percentages adding up to 100, the total and the reader's choice", async () => {
    await renderBar(afterVote, { signedIn: true });
    expect(screen.getByText("✓ Oui")).toBeTruthy();
    expect(screen.getByText("62 %")).toBeTruthy();
    expect(screen.getByText("31 %")).toBeTruthy();
    expect(screen.getByText("7 %")).toBeTruthy();
    expect(screen.getByText("128 votes · votre choix : Oui")).toBeTruthy();
  });

  it("invites an anonymous visitor to sign in, without vote buttons", async () => {
    await renderBar(hidden, { signedIn: false });
    expect(
      await screen.findByText("Connectez-vous pour voter ou voir les résultats."),
    ).toBeTruthy();
    expect(screen.getByText("• Oui")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Oui" })).toBeNull();
  });
});
