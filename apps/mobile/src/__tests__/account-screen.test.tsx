import { APP_NAME } from "@fama/shared";
import { screen } from "@testing-library/react-native";
import AccountScreen from "../app/account";
import { apiClient } from "../lib/apiClient";
import { renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));

describe("AccountScreen", () => {
  beforeEach(async () => {
    await apiClient.endSession();
  });

  it("offers to sign in or sign up when anonymous", async () => {
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText("Se connecter")).toBeTruthy();
    expect(screen.getByText("Créer un compte")).toBeTruthy();
    expect(APP_NAME).toBe("Fama");
  });
});
