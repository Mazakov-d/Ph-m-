import { fireEvent, screen, waitFor } from "@testing-library/react-native";
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
  push: jest.fn(),
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

  it("shows « Tableau de bord » but not « Publier » to a visitor, and greys the current tab", async () => {
    await renderWithProviders(<AppHeader canGoBack={false} />);
    expect(screen.getByText("Tableau de bord")).toBeTruthy();
    expect(screen.queryByText("Publier")).toBeNull();
    expect(screen.getByLabelText("Phémé, le fil des publications")).toBeSelected();
    expect(screen.getByRole("tab", { name: "Tableau de bord" })).not.toBeSelected();
  });

  it("shows « Publier » to a validated editor (SPEC §2.5)", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockResolvedValue(jsonResponse(200, sessionFor("EDITOR", "INDEPENDENT")));
    await renderWithProviders(<AppHeader canGoBack={false} />);
    expect(await screen.findByText("Publier")).toBeTruthy();
  });

  it("gives an editor « Ma page », their profile (docs/DECISIONS.md)", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    const session = sessionFor("EDITOR", "INDEPENDENT");
    fetchMock.mockResolvedValue(jsonResponse(200, session));
    await renderWithProviders(<AppHeader canGoBack={false} />);
    await fireEvent.press(await screen.findByText("Ma page"));
    expect(mockRouter.push).toHaveBeenCalledWith(`/editors/${session.user.id}`);
  });

  it("gives no « Ma page » to a reader", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    fetchMock.mockResolvedValue(jsonResponse(200, sessionFor("READER")));
    await renderWithProviders(<AppHeader canGoBack={false} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Ma page")).toBeNull();
  });

  it("switches tabs without stacking them", async () => {
    await renderWithProviders(<AppHeader canGoBack={false} />);
    await fireEvent.press(screen.getByText("Tableau de bord"));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/account");
    expect(mockRouter.dismissAll).not.toHaveBeenCalled();
  });

  it("closes the pages opened above the tabs when a tab is chosen from a post", async () => {
    mockPathname = "/posts/1";
    mockRouter.canDismiss.mockReturnValue(true);
    await renderWithProviders(<AppHeader canGoBack />);
    await fireEvent.press(screen.getByLabelText("Phémé, le fil des publications"));
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
