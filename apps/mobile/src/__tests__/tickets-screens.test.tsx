import type { MessagePublic, TicketModeration } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AuditLogScreen from "../app/admin/audit";
import ModeratorTicketsScreen from "../app/moderation/tickets";
import SupportScreen from "../app/support";
import { Conversation } from "../features/tickets/components/Conversation";
import { apiClient } from "../lib/apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import { sessionFor } from "../test/fixtures";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

const ID = (n: number) => `${n}${n}1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11`;
const now = new Date().toISOString();
const ticket: TicketModeration = {
  id: ID(1),
  kind: "SUPPORT",
  status: "NEW",
  topic: "PROBLEM",
  createdAt: now,
  lastMessageAt: now,
  openedById: ID(2),
  openedByPseudo: "lecteur",
  audience: "READER",
  editorId: null,
  editorPseudo: null,
  assignedModeratorId: null,
  assignedModeratorPseudo: null,
  assignedAt: null,
  firstMessage: "Mon compte a été suspendu à tort.",
  awaitingTeam: true,
};
const messages: MessagePublic[] = [
  {
    id: ID(3),
    ticketId: ID(1),
    authorPseudo: "lecteur",
    fromTeam: false,
    authorRole: "READER",
    content: "Bonjour",
    createdAt: now,
  },
  {
    id: ID(4),
    ticketId: ID(1),
    authorPseudo: "modo",
    fromTeam: true,
    authorRole: "MODERATOR",
    content: "Je regarde.",
    createdAt: now,
  },
];

describe("support and chat screens (SPEC §8)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const posted = (suffix: string) =>
    fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith(suffix) && init?.method === "POST",
    );

  async function signIn(role: "READER" | "MODERATOR" | "ADMIN", answer: (path: string) => unknown) {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      return path.endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor(role))
        : jsonResponse(200, answer(path));
    });
  }

  beforeEach(async () => {
    fetchMock.mockReset();
    mockPush.mockReset();
    await apiClient.endSession();
  });

  it("contacts Phémé with a reason and goes to the conversation (docs/DECISIONS.md)", async () => {
    await signIn("READER", (path) => (path.endsWith("/tickets/mine") ? [] : ticket));
    await renderWithProviders(<SupportScreen />);
    await fireEvent.changeText(
      await screen.findByLabelText("Votre message"),
      "Mon compte a été suspendu à tort.",
    );
    await fireEvent.press(screen.getByText("Envoyer"));
    expect(screen.getByText("Choisissez un motif et écrivez votre message.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Mon compte ou une sanction"));
    await fireEvent.press(screen.getByText("Envoyer"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/tickets/${ID(1)}`));
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/tickets") && init?.method === "POST",
    );
    const body = call?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      topic: "ACCOUNT",
      content: "Mon compte a été suspendu à tort.",
    });
  });

  it("shows the conversation, the team's messages marked, and sends a message", async () => {
    await signIn("READER", (path) => (path.endsWith("/messages") ? messages : messages[0]));
    await renderWithProviders(<Conversation ticketId={ID(1)} />);
    expect(await screen.findByText("Je regarde.")).toBeTruthy();
    expect(screen.getByText(/^Modo · /)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Votre message"), "Merci");
    await fireEvent.press(screen.getByText("Envoyer"));
    await waitFor(() => expect(posted(`/tickets/${ID(1)}/messages`)).toBeTruthy());
  });

  it("sends a message with Enter (docs/DECISIONS.md)", async () => {
    await signIn("READER", (path) => (path.endsWith("/messages") ? messages : messages[0]));
    await renderWithProviders(<Conversation ticketId={ID(1)} />);
    await screen.findByText("Je regarde.");
    await fireEvent.changeText(screen.getByLabelText("Votre message"), "Merci");
    await fireEvent(screen.getByLabelText("Votre message"), "submitEditing");
    await waitFor(() => expect(posted(`/tickets/${ID(1)}/messages`)).toBeTruthy());
  });

  it("lets a moderator take a NEW ticket", async () => {
    await signIn("MODERATOR", (path) => (path.includes("scope=unassigned") ? [ticket] : ticket));
    await renderWithProviders(<ModeratorTicketsScreen />);
    expect(await screen.findByText("Mon compte a été suspendu à tort.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Prendre en charge"));
    await waitFor(() => expect(posted(`/moderation/tickets/${ID(1)}/assign`)).toBeTruthy());
  });

  it("shows the audit log to an admin", async () => {
    await signIn("ADMIN", () => ({
      items: [
        {
          id: ID(5),
          actorId: ID(6),
          actorPseudo: "direction",
          action: "ticket.read",
          targetType: "Ticket",
          targetId: ID(1),
          metadata: null,
          createdAt: now,
        },
      ],
      nextCursor: null,
    }));
    await renderWithProviders(<AuditLogScreen />);
    expect(await screen.findByText("ticket.read")).toBeTruthy();
  });
});
