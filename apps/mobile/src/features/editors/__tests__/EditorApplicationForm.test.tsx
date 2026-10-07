import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { getDocumentAsync } from "expo-document-picker";
import { apiClient } from "../../../lib/apiClient";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { EditorApplicationForm } from "../components/EditorApplicationForm";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));

const pickedPdf = {
  canceled: false as const,
  assets: [
    {
      name: "carte.pdf",
      uri: "file:///carte.pdf",
      mimeType: "application/pdf",
      size: 2048,
      lastModified: 0,
    },
  ],
};

async function fillIdentity() {
  await fireEvent.changeText(screen.getByLabelText("Prénom (identité légale)"), "Clara");
  await fireEvent.changeText(screen.getByLabelText("Nom (identité légale)"), "Martin");
  await fireEvent.changeText(screen.getByLabelText("Ligne éditoriale"), "Enquêtes.");
  await fireEvent.changeText(screen.getByLabelText("Propriétaire du média"), "Clara Martin");
}

describe("EditorApplicationForm", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    jest.mocked(getDocumentAsync).mockResolvedValue(pickedPdf);
    await apiClient.endSession();
  });

  it("explains missing fields in French without calling the API", async () => {
    await renderWithProviders(<EditorApplicationForm />);
    await fireEvent.press(screen.getByText("Envoyer ma demande"));
    expect((await screen.findAllByText("Champ obligatoire.")).length).toBeGreaterThanOrEqual(4);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a document", async () => {
    await renderWithProviders(<EditorApplicationForm />);
    await fillIdentity();
    await fireEvent.press(screen.getByText("Envoyer ma demande"));
    expect(await screen.findByText("Ajoutez au moins un document d'identité.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the application as JSON and the documents as files", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        status: "PENDING",
        rejectionReason: null,
        editorialLine: "Enquêtes.",
        ownerName: "Clara Martin",
        ownerGroup: null,
        showIdentityPublicly: false,
        documentCount: 1,
        createdAt: "2026-10-07T12:00:00.000Z",
      }),
    );
    await renderWithProviders(<EditorApplicationForm />);
    await fillIdentity();
    await fireEvent.press(screen.getByText("Ajouter des documents"));
    expect(await screen.findByText("carte.pdf")).toBeTruthy();
    await fireEvent.press(screen.getByText("Envoyer ma demande"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    if (body instanceof FormData) {
      const application = body.get("application");
      expect(typeof application === "string" ? JSON.parse(application) : null).toEqual({
        legalFirstName: "Clara",
        legalLastName: "Martin",
        editorialLine: "Enquêtes.",
        ownerName: "Clara Martin",
        // The empty optional field is sent as null.
        ownerGroup: null,
        showIdentityPublicly: false,
      });
      expect(body.getAll("documents")).toHaveLength(1);
    }
  });

  it("explains a document refused by the API", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { code: "INVALID_DOCUMENT", message: "carte.pdf is not a PDF" }),
    );
    await renderWithProviders(<EditorApplicationForm />);
    await fillIdentity();
    await fireEvent.press(screen.getByText("Ajouter des documents"));
    await screen.findByText("carte.pdf");
    await fireEvent.press(screen.getByText("Envoyer ma demande"));
    expect(
      await screen.findByText("Un document est invalide : PDF, JPEG ou PNG de 10 Mo maximum."),
    ).toBeTruthy();
  });
});
