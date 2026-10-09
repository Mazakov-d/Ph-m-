import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { DeleteAccount } from "../components/DeleteAccount";

describe("DeleteAccount (SPEC §10)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("deletes the account with the password, then forgets the session", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockResolvedValue(jsonResponse(204));
    await renderWithProviders(<DeleteAccount onCancel={jest.fn()} />);
    expect(screen.getByText(/signés « Compte supprimé »/)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Votre mot de passe, pour confirmer"),
      "mot-de-passe",
    );
    await fireEvent.press(screen.getByText("Supprimer définitivement"));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true),
    );
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(String(call?.[0])).toMatch(/\/users\/me$/);
    expect(call?.[1]?.body).toBe(JSON.stringify({ password: "mot-de-passe" }));
    await waitFor(async () => expect(await tokenStorage.getRefreshToken()).toBeNull());
  });
});
