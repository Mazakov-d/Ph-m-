import type { CommentPublic, CommentThreadPublic } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { ARTICLE_DETAIL, sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { CommentsSection } from "../components/CommentsSection";

jest.mock("expo-router", () => ({
  // A link is a Text in React Native.
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
}));

const ME = sessionFor("READER").user.id;

/** The element at `index`, with a clear failure when it is missing. */
function at<Element>(elements: Element[], index: number): Element {
  const element = elements[index];
  if (element === undefined) {
    throw new Error(`No element at index ${index}`);
  }
  return element;
}
const OTHER = "9b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";

function comment(id: string, overrides: Partial<CommentPublic> = {}): CommentPublic {
  return {
    id,
    postId: ARTICLE_DETAIL.id,
    parentId: null,
    authorId: OTHER,
    authorPseudo: "hugo",
    content: `Contenu ${id.slice(0, 1)}`,
    status: "VISIBLE",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

const ROOT_ID = "4b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11";
const threads: CommentThreadPublic[] = [
  {
    ...comment(ROOT_ID, { content: "Merci pour les sources." }),
    replies: [
      comment("5b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", { parentId: ROOT_ID, content: "D'accord." }),
    ],
  },
  {
    ...comment("6b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", { status: "DELETED", content: null }),
    replies: [],
  },
  {
    ...comment("7b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", { status: "UNDER_REVIEW", content: null }),
    replies: [],
  },
  {
    ...comment("8b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11", {
      authorId: ME,
      authorPseudo: "Testeur",
      content: "Le mien.",
    }),
    replies: [],
  },
];

describe("CommentsSection (SPEC §6)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const callsTo = (method: string, suffix: string) =>
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith(suffix) && (init?.method ?? "GET") === method,
    );

  /** Answers the API like the server would, for a reader signed in or not. */
  async function renderSection({
    signedIn,
    post = ARTICLE_DETAIL,
    onPost = jsonResponse(201, comment(ROOT_ID)),
  }: {
    signedIn: boolean;
    post?: typeof ARTICLE_DETAIL;
    onPost?: Response;
  }) {
    if (signedIn) {
      await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    }
    fetchMock.mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/auth/refresh")) return jsonResponse(200, sessionFor("READER"));
      if (init?.method === "POST" && path.endsWith("/comments")) return onPost;
      if (init?.method === "DELETE")
        return jsonResponse(200, comment(ROOT_ID, { status: "DELETED", content: null }));
      return jsonResponse(200, { items: threads, nextCursor: null });
    });
    await renderWithProviders(<CommentsSection post={post} />);
    await screen.findByText("Merci pour les sources.");
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows threads, replies and the placeholders of hidden comments", async () => {
    await renderSection({ signedIn: false });
    expect(screen.getByText("D'accord.")).toBeTruthy();
    expect(screen.getByText("Commentaire supprimé")).toBeTruthy();
    expect(screen.getByText("Commentaire en cours d'examen par la modération")).toBeTruthy();
  });

  it("invites an anonymous visitor to sign in instead of showing the form", async () => {
    await renderSection({ signedIn: false });
    expect(screen.getByText("Connectez-vous pour commenter.")).toBeTruthy();
    expect(screen.queryByLabelText("Votre commentaire")).toBeNull();
  });

  it("says when comments are disabled", async () => {
    await renderSection({ signedIn: true, post: { ...ARTICLE_DETAIL, commentsEnabled: false } });
    expect(screen.getByText("Les commentaires sont désactivés pour cet article.")).toBeTruthy();
  });

  it("publishes a comment", async () => {
    await renderSection({ signedIn: true });
    await fireEvent.changeText(await screen.findByLabelText("Votre commentaire"), "Très clair.");
    await fireEvent.press(at(screen.getAllByText("Publier"), 0));
    await waitFor(() => expect(callsTo("POST", "/comments")).toHaveLength(1));
    const body = callsTo("POST", "/comments")[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      postId: ARTICLE_DETAIL.id,
      parentId: null,
      content: "Très clair.",
    });
  });

  it("replies to the thread, even from a reply", async () => {
    await renderSection({ signedIn: true });
    const replyButtons = await screen.findAllByText("Répondre");
    await fireEvent.press(at(replyButtons, 1)); // « Répondre » under the reply « D'accord. »
    await fireEvent.changeText(screen.getByLabelText("Votre réponse"), "Moi aussi.");
    await fireEvent.press(at(screen.getAllByText("Publier"), 1));
    await waitFor(() => expect(callsTo("POST", "/comments")).toHaveLength(1));
    const body = callsTo("POST", "/comments")[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toMatchObject({ parentId: ROOT_ID });
  });

  it("explains a comment blocked by the filter, generically", async () => {
    await renderSection({
      signedIn: true,
      onPost: jsonResponse(422, { code: "TOXIC_CONTENT", message: "forbidden term" }),
    });
    await fireEvent.changeText(await screen.findByLabelText("Votre commentaire"), "…");
    await fireEvent.press(at(screen.getAllByText("Publier"), 0));
    expect(
      await screen.findByText(
        "Votre commentaire contient un terme interdit par les règles de la communauté. Reformulez-le.",
      ),
    ).toBeTruthy();
  });

  it("deletes one's own comment after confirmation only", async () => {
    await renderSection({ signedIn: true });
    const deleteButtons = await screen.findAllByText("Supprimer");
    expect(deleteButtons).toHaveLength(1); // only the user's own comment
    await fireEvent.press(at(deleteButtons, 0));
    expect(callsTo("DELETE", "/comments/8b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11")).toHaveLength(0);
    await fireEvent.press(screen.getByText("Oui, supprimer"));
    await waitFor(() =>
      expect(callsTo("DELETE", "/comments/8b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11")).toHaveLength(1),
    );
  });
});
