import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

const CURRENT = "Mot de passe actuel";
const NEXT = "Nouveau mot de passe (12 caractères au moins)";
const AGAIN = "Nouveau mot de passe, encore une fois";

describe("ChangePasswordForm (docs/DECISIONS.md)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  async function fill(current: string, next: string, again: string) {
    await fireEvent.changeText(screen.getByLabelText(CURRENT), current);
    await fireEvent.changeText(screen.getByLabelText(NEXT), next);
    await fireEvent.changeText(screen.getByLabelText(AGAIN), again);
    await fireEvent.press(screen.getByText("Changer le mot de passe"));
  }

  it("asks for the same new password twice, then sends it and keeps the new session", async () => {
    const session = { ...sessionFor("READER"), tokens: { accessToken: "a2", refreshToken: "r2" } };
    fetchMock.mockResolvedValue(jsonResponse(200, session));
    await renderWithProviders(<ChangePasswordForm />);

    await fill("ancien-mot-de-passe", "nouveau-mot-de-passe", "autre-mot-de-passe");
    expect(await screen.findByText("Les deux mots de passe ne correspondent pas.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    await fill("ancien-mot-de-passe", "nouveau-mot-de-passe", "nouveau-mot-de-passe");
    expect(
      await screen.findByText("Mot de passe changé. Vos autres appareils sont déconnectés."),
    ).toBeTruthy();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/password"));
    const body = call?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      currentPassword: "ancien-mot-de-passe",
      newPassword: "nouveau-mot-de-passe",
    });
    await waitFor(async () => expect(await tokenStorage.getRefreshToken()).toBe("r2"));
  });

  it("says when the current password is wrong", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "Wrong password" }),
    );
    await renderWithProviders(<ChangePasswordForm />);
    await fill("mauvais", "nouveau-mot-de-passe", "nouveau-mot-de-passe");
    expect(await screen.findByText("Mot de passe actuel incorrect.")).toBeTruthy();
  });
});
