import { render, screen } from "@testing-library/react-native";
import LegalScreen from "../app/legal/[page]";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ page: "privacy" }),
  Stack: { Screen: () => null },
}));

describe("LegalScreen (SPEC §10)", () => {
  it("shows the privacy page, which must mention that chats are kept and may be read", async () => {
    await render(<LegalScreen />);
    expect(screen.getByText(/conservées et peuvent être lues par la direction/)).toBeTruthy();
    expect(screen.getByText(/Brouillon/)).toBeTruthy();
  });
});
