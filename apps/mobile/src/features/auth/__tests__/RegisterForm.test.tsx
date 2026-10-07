import type { AuthSession } from "@fama/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { RegisterForm } from "../components/RegisterForm";

const session: AuthSession = {
  user: {
    id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    email: "lea@test.fr",
    pseudo: "Léa",
    role: "READER",
    editorStatus: null,
    suspendedUntil: null,
    bannedAt: null,
  },
  tokens: { accessToken: "access", refreshToken: "refresh" },
};

async function fillForm(values: { email: string; pseudo: string; password: string }) {
  await fireEvent.changeText(screen.getByLabelText("Adresse e-mail"), values.email);
  await fireEvent.changeText(
    screen.getByLabelText("Pseudo (affiché sur vos commentaires)"),
    values.pseudo,
  );
  await fireEvent.changeText(screen.getByLabelText("Mot de passe"), values.password);
  await fireEvent.press(screen.getByText("Créer mon compte"));
}

describe("RegisterForm", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const valid = { email: "lea@test.fr", pseudo: "Léa", password: "mot-de-passe-solide" };

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("explains invalid fields in French without calling the API", async () => {
    await renderWithProviders(<RegisterForm onSuccess={jest.fn()} />);
    await fillForm({ email: "lea", pseudo: "a@", password: "court" });

    expect(await screen.findByText("Adresse e-mail invalide.")).toBeTruthy();
    expect(screen.getByText("Au moins 12 caractères.")).toBeTruthy();
    expect(screen.getByText("Au moins 3 caractères.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a taken pseudo under the pseudo field", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { code: "PSEUDO_TAKEN", message: "This pseudo is already taken" }),
    );
    await renderWithProviders(<RegisterForm onSuccess={jest.fn()} />);
    await fillForm(valid);

    expect(await screen.findByText("Ce pseudo est déjà pris.")).toBeTruthy();
  });

  it("explains an unreachable server", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await renderWithProviders(<RegisterForm onSuccess={jest.fn()} />);
    await fillForm(valid);

    expect(
      await screen.findByText("Impossible de joindre le serveur. Vérifiez votre connexion."),
    ).toBeTruthy();
  });

  it("signs the new account in", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, session));
    const onSuccess = jest.fn();
    await renderWithProviders(<RegisterForm onSuccess={onSuccess} />);
    await fillForm(valid);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const sentBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(typeof sentBody === "string" ? JSON.parse(sentBody) : null).toEqual(valid);
  });
});
