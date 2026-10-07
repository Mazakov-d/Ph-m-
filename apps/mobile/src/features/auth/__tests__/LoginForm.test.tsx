import { fireEvent, screen } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { LoginForm } from "../components/LoginForm";

describe("LoginForm", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("explains wrong credentials in French", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "Invalid e-mail or password" }),
    );
    await renderWithProviders(<LoginForm onSuccess={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Adresse e-mail"), "lea@test.fr");
    await fireEvent.changeText(screen.getByLabelText("Mot de passe"), "mauvais");
    await fireEvent.press(screen.getByText("Se connecter"));

    expect(await screen.findByText("E-mail ou mot de passe incorrect.")).toBeTruthy();
  });
});
