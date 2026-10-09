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

  it("signs in with Enter after the password (docs/DECISIONS.md)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "Invalid e-mail or password" }),
    );
    await renderWithProviders(<LoginForm onSuccess={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Adresse e-mail"), "lea@test.fr");
    await fireEvent.changeText(screen.getByLabelText("Mot de passe"), "mauvais");
    await fireEvent(screen.getByLabelText("Mot de passe"), "submitEditing");

    expect(await screen.findByText("E-mail ou mot de passe incorrect.")).toBeTruthy();
  });

  it("shows the password being typed on demand (interface brief)", async () => {
    await renderWithProviders(<LoginForm onSuccess={jest.fn()} />);
    const password = screen.getByLabelText("Mot de passe");
    expect(password.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText("Afficher : Mot de passe"));
    expect(screen.getByLabelText("Mot de passe").props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText("Masquer : Mot de passe"));
    expect(screen.getByLabelText("Mot de passe").props.secureTextEntry).toBe(true);
  });
});
