import { APP_NAME } from "@fama/shared";
import { render, screen } from "@testing-library/react-native";
import HomeScreen from "./index";

describe("HomeScreen", () => {
  it("displays the application name imported from shared", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
  });
});
