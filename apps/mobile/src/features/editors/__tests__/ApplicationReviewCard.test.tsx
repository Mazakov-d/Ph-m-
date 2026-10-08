import type { AuthSession, EditorModeration, UserRole } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { ApplicationReviewCard } from "../components/ApplicationReviewCard";

const application: EditorModeration = {
  userId: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a12",
  pseudo: "Nouveau Média",
  editorStatus: "PENDING",
  legalFirstName: "Hugo",
  legalLastName: "Petit",
  editorialLine: "Actualité locale de la région nantaise.",
  ownerName: "Association Nouveau Média",
  ownerGroup: null,
  showIdentityPublicly: false,
  applicantType: "JOURNALIST",
  siret: null,
  websiteUrl: null,
  publicationDirector: null,
  professionalEmail: null,
  cppapNumber: null,
  workLinks: ["https://exemple.fr/1", "https://exemple.fr/2", "https://exemple.fr/3"],
  pressCardNumber: null,
  socialAccountUrl: null,
  verificationCode: "PHEME-ABCDEF",
  verifiedProofs: [],
  documentCount: 2,
  rejectionReason: null,
  createdAt: "2026-10-07T12:00:00.000Z",
};

function sessionFor(role: UserRole): AuthSession {
  return {
    user: {
      id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      email: "modo@test.fr",
      pseudo: "Modo",
      role,
      editorStatus: null,
      suspendedUntil: null,
      bannedAt: null,
    },
    tokens: { accessToken: "access", refreshToken: "refresh" },
  };
}

describe("ApplicationReviewCard (SPEC §2.2)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  /** Renders the card for a signed-in moderator or admin; `decision` answers the API call. */
  async function renderAs(role: UserRole) {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/auth/refresh")
        ? jsonResponse(200, sessionFor(role))
        : jsonResponse(201, { ...application, editorStatus: "INDEPENDENT" }),
    );
    await renderWithProviders(<ApplicationReviewCard application={application} />);
    await screen.findByText("Refuser");
  }

  const decisionBody = () => {
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/decision"));
    const body = call?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : null;
  };

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("shows the legal identity and the document count", async () => {
    await renderAs("MODERATOR");
    expect(screen.getByText("Identité : Hugo Petit")).toBeTruthy();
    expect(screen.getByText("2 document(s) : à consulter depuis la version web.")).toBeTruthy();
  });

  /** docs/DECISIONS.md (editor applications): the required proofs of a journalist. */
  async function checkRequiredProofs() {
    await fireEvent.press(screen.getByText("Pièce d'identité vérifiée"));
    await fireEvent.press(screen.getByText("Au moins 3 travaux publiés et signés"));
  }

  it("offers to validate only once every required proof is checked", async () => {
    await renderAs("MODERATOR");
    expect(screen.getByText("https://exemple.fr/1")).toBeTruthy();
    expect(screen.queryByText("Valider (Indépendant)")).toBeNull();
    await fireEvent.press(screen.getByText("Pièce d'identité vérifiée"));
    expect(screen.queryByText("Valider (Indépendant)")).toBeNull();
    await fireEvent.press(screen.getByText("Au moins 3 travaux publiés et signés"));
    expect(screen.getByText("Valider (Indépendant)")).toBeTruthy();
  });

  it("lets a moderator validate INDEPENDENT but not certify", async () => {
    await renderAs("MODERATOR");
    await checkRequiredProofs();
    expect(screen.queryByText("Certifier")).toBeNull();
    await fireEvent.press(screen.getByText("Valider (Indépendant)"));
    await waitFor(() =>
      expect(decisionBody()).toEqual({
        status: "INDEPENDENT",
        checkedProofs: ["IDENTITY", "PUBLISHED_WORKS"],
      }),
    );
  });

  it("lets an admin certify", async () => {
    await renderAs("ADMIN");
    await checkRequiredProofs();
    await fireEvent.press(screen.getByText("Certifier"));
    await waitFor(() =>
      expect(decisionBody()).toEqual({
        status: "CERTIFIED",
        checkedProofs: ["IDENTITY", "PUBLISHED_WORKS"],
      }),
    );
  });

  it("requires a reason to reject", async () => {
    await renderAs("MODERATOR");
    await fireEvent.press(screen.getByText("Refuser"));
    await fireEvent.press(screen.getByText("Confirmer le refus"));
    expect(await screen.findByText("Le motif est obligatoire.")).toBeTruthy();
    expect(decisionBody()).toBeNull();

    await fireEvent.changeText(
      screen.getByLabelText("Motif du refus (communiqué au demandeur)"),
      "Pièce illisible",
    );
    await fireEvent.press(screen.getByText("Confirmer le refus"));
    await waitFor(() =>
      expect(decisionBody()).toEqual({ status: "REJECTED", rejectionReason: "Pièce illisible" }),
    );
  });
});
