import type { PostPublic, UserRole, VoteSummaryPublic } from "@fama/shared";
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
const results = {
  totalVotes: 128,
  counts: [
    { optionId: YES, count: 79 },
    { optionId: NO, count: 40 },
    { optionId: MAYBE, count: 9 },
  ],
};
const hidden: VoteSummaryPublic = {
  options,
  myOptionId: null,
  revealedResults: false,
  results: null,
};
const afterVote: VoteSummaryPublic = { options, myOptionId: YES, revealedResults: false, results };
const afterReveal: VoteSummaryPublic = {
  options,
  myOptionId: null,
  revealedResults: true,
  results,
};
const opinion = (votes: VoteSummaryPublic): PostPublic => ({
  ...ARTICLE_DETAIL,
  kind: "OPINION",
  votes,
});

describe("VoteBar (SPEC §7)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const callsTo = (suffix: string) =>
    fetchMock.mock.calls.filter(([url]) => String(url).endsWith(suffix));

  async function renderBar(
    votes: VoteSummaryPublic,
    role: UserRole | null,
    apiAnswer = jsonResponse(200, afterVote),
  ) {
    if (role) {
      await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    }
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh") && role
        ? jsonResponse(200, sessionFor(role))
        : apiAnswer,
    );
    await renderWithProviders(<VoteBar post={opinion(votes)} />);
    if (role) {
      // Wait for the session to be restored (results visible, or the reveal link).
      await screen.findByText(votes.results ? /^128 votes/ : "Voir sans voter");
    }
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the choices but no result before voting", async () => {
    await renderBar(hidden, "READER");
    expect(screen.getByText("Sans avis")).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("votes only after the choice is confirmed", async () => {
    await renderBar(hidden, "READER");
    expect(screen.queryByText("Valider mon vote")).toBeNull();
    await fireEvent.press(screen.getByText("Non"));
    expect(callsTo("/vote")).toHaveLength(0);
    expect(
      screen.getByText("Votre vote est définitif : il ne pourra plus être changé."),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText("Valider mon vote"));
    await waitFor(() => expect(callsTo("/vote")).toHaveLength(1));
    const body = callsTo("/vote")[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({ optionId: NO });
  });

  it("asks a confirmation before « Voir sans voter », which is final", async () => {
    await renderBar(hidden, "READER", jsonResponse(200, afterReveal));
    await fireEvent.press(screen.getByText("Voir sans voter"));
    expect(
      screen.getByText(
        "Après avoir vu les résultats, vous ne pourrez plus voter sur cette opinion.",
      ),
    ).toBeTruthy();
    expect(callsTo("/vote/reveal")).toHaveLength(0);

    await fireEvent.press(screen.getByText("Annuler"));
    expect(screen.getByText("Voir sans voter")).toBeTruthy();
    await fireEvent.press(screen.getByText("Voir sans voter"));
    await fireEvent.press(screen.getByText("Voir les résultats"));
    await waitFor(() => expect(callsTo("/vote/reveal")).toHaveLength(1));
  });

  it("shows percentages adding up to 100, the total and the reader's choice, frozen", async () => {
    await renderBar(afterVote, "READER");
    expect(screen.getByText("✓ Oui")).toBeTruthy();
    expect(screen.getByText("62 %")).toBeTruthy();
    expect(screen.getByText("31 %")).toBeTruthy();
    expect(screen.getByText("7 %")).toBeTruthy();
    expect(screen.getByText("128 votes · votre choix : Oui")).toBeTruthy();
    expect(screen.queryByText("Valider mon vote")).toBeNull();
    expect(screen.queryByText("Voir sans voter")).toBeNull();
  });

  it("says when the results were seen without voting", async () => {
    await renderBar(afterReveal, "READER");
    expect(screen.getByText("128 votes · vous avez vu les résultats sans voter")).toBeTruthy();
  });

  it("explains a refused vote", async () => {
    await renderBar(
      hidden,
      "READER",
      jsonResponse(409, { code: "VOTE_LOCKED_AFTER_REVEAL", message: "locked" }),
    );
    await fireEvent.press(screen.getByText("Oui"));
    await fireEvent.press(screen.getByText("Valider mon vote"));
    expect(
      await screen.findByText("Vous avez vu les résultats : vous ne pouvez plus voter."),
    ).toBeTruthy();
  });

  it("lets a suspended account see the results but not vote", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async () =>
      jsonResponse(200, {
        ...sessionFor("READER"),
        user: { ...sessionFor("READER").user, suspendedUntil: "2099-01-01T00:00:00.000Z" },
      }),
    );
    await renderWithProviders(<VoteBar post={opinion(hidden)} />);
    await screen.findByText("Voir sans voter");
    expect(screen.getByText("• Oui")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("invites an anonymous visitor to sign in, without choices to select", async () => {
    await renderBar(hidden, null);
    expect(
      await screen.findByText("Connectez-vous pour voter ou voir les résultats."),
    ).toBeTruthy();
    expect(screen.getByText("• Oui")).toBeTruthy();
    expect(screen.queryByText("Voir sans voter")).toBeNull();
  });
});
