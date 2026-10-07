import { APP_NAME, APP_SLOGAN } from "@fama/shared";
import { render, screen } from "@testing-library/react-native";
import HomeScreen from "./index";

describe("HomeScreen", () => {
  it("displays the application name and slogan imported from shared", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
    expect(screen.getByText(APP_SLOGAN)).toBeTruthy();
  });
});
