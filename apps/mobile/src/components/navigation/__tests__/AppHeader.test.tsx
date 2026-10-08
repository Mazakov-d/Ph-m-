import { fireEvent, screen } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { tokenStorage } from "../../../lib/tokenStorage";
import { sessionFor } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { AppHeader } from "../AppHeader";

const mockRouter = {
  canGoBack: jest.fn(() => true),
  back: jest.fn(),
  canDismiss: jest.fn(() => false),
  dismissAll: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
};
let mockPathname = "/";
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

describe("AppHeader (interface brief: tabs)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    Object.values(mockRouter).forEach((mock) => mock.mockClear());
    mockPathname = "/";
    await apiClient.endSession();
  });

  it("shows « Compte » but not « Publier » to a visitor, and greys the current tab", async () => {
    await renderWithProviders(<AppHeader canGoBack={false} />);
    expect(screen.getByText("Compte")).toBeTruthy();
    expect(screen.queryByText("Publier")).toBeNull();
    expect(screen.getByLabelText("Fama, le fil des publications")).toBeSelected();
    expect(screen.getByRole("tab", { name: "Compte" })).not.toBeSelected();
  });

  it("shows « Publier » to a validated editor (SPEC §2.5)", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockResolvedValue(jsonResponse(200, sessionFor("EDITOR", "INDEPENDENT")));
    await renderWithProviders(<AppHeader canGoBack={false} />);
    expect(await screen.findByText("Publier")).toBeTruthy();
  });

  it("switches tabs without stacking them", async () => {
    await renderWithProviders(<AppHeader canGoBack={false} />);
    await fireEvent.press(screen.getByText("Compte"));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/account");
    expect(mockRouter.dismissAll).not.toHaveBeenCalled();
  });

  it("closes the pages opened above the tabs when a tab is chosen from a post", async () => {
    mockPathname = "/posts/1";
    mockRouter.canDismiss.mockReturnValue(true);
    await renderWithProviders(<AppHeader canGoBack />);
    await fireEvent.press(screen.getByLabelText("Fama, le fil des publications"));
    expect(mockRouter.dismissAll).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith("/");
  });

  it("has no « < » on a tab", async () => {
    await renderWithProviders(<AppHeader canGoBack={false} />);
    expect(screen.queryByLabelText("Retour")).toBeNull();
  });

  it("goes back with « < » on a page opened above the tabs", async () => {
    await renderWithProviders(<AppHeader canGoBack />);
    await fireEvent.press(screen.getByLabelText("Retour"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
