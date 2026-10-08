import { APP_NAME } from "@fama/shared";
import { fireEvent, screen } from "@testing-library/react-native";
import AccountScreen from "../app/(tabs)/account";
import { apiClient } from "../lib/apiClient";
import { renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/account",
  Stack: { Screen: () => null },
  // A link is a Text in React Native.
  Link: ({ children }: { children: string }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, children);
  },
}));

describe("AccountScreen", () => {
  beforeEach(async () => {
    await apiClient.endSession();
  });

  it("opens the sign-in and sign-up forms in the account box (interface brief)", async () => {
    await renderWithProviders(<AccountScreen />);
    await fireEvent.press(await screen.findByText("Se connecter"));
    expect(screen.getByLabelText("Adresse e-mail")).toBeTruthy();
    expect(screen.getByRole("header", { name: "La rumeur, sourcée." })).toBeTruthy();

    await fireEvent.press(screen.getByText("Pas encore de compte ? En créer un"));
    expect(screen.getByLabelText("Pseudo (affiché sur vos commentaires)")).toBeTruthy();
    await fireEvent.press(screen.getByText("Déjà un compte ? Se connecter"));
    expect(screen.queryByLabelText("Pseudo (affiché sur vos commentaires)")).toBeNull();
  });

  it("offers to sign in or sign up when anonymous", async () => {
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText("Se connecter")).toBeTruthy();
    expect(screen.getByText("Créer un compte")).toBeTruthy();
    expect(APP_NAME).toBe("Fama");
    // Interface brief: the slogan heads the account box of a visitor.
    expect(screen.getByRole("header", { name: "La rumeur, sourcée." })).toBeTruthy();
    // SPEC §10: the static pages are reachable without an account.
    expect(screen.getByText("Politique de confidentialité")).toBeTruthy();
  });
});
