import { APP_NAME, APP_SLOGAN } from "@fama/shared";
import { screen } from "@testing-library/react-native";
import HomeScreen from "../app/index";
import { apiClient } from "../lib/apiClient";
import { renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe("HomeScreen", () => {
  beforeEach(async () => {
    await apiClient.endSession();
  });

  it("displays the application name and slogan imported from shared", async () => {
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
    expect(screen.getByText(APP_SLOGAN)).toBeTruthy();
  });

  it("offers to sign in or sign up when anonymous", async () => {
    await renderWithProviders(<HomeScreen />);
    expect(await screen.findByText("Se connecter")).toBeTruthy();
    expect(screen.getByText("Créer un compte")).toBeTruthy();
  });
});
