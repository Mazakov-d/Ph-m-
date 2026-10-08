import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AlertsScreen from "../app/alerts";
import { apiClient } from "../lib/apiClient";
import { jsonResponse, renderWithProviders } from "../test/renderWithProviders";

jest.mock("expo-router", () => ({ Stack: { Screen: () => null } }));

const SPORT_FRANCE = {
  id: "5b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  theme: "SPORT",
  zone: "FRANCE",
  region: null,
  createdAt: new Date().toISOString(),
};

describe("AlertsScreen (docs/DECISIONS.md: push notifications)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const calls = (method: string, suffix: string) =>
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith(suffix) && (init?.method ?? "GET") === method,
    );

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("lists the alerts and deletes one", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "DELETE" ? jsonResponse(204) : jsonResponse(200, [SPORT_FRANCE]),
    );
    await renderWithProviders(<AlertsScreen />);
    expect(await screen.findByText("Sport · France")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Supprimer l'alerte Sport · France"));
    await waitFor(() => expect(calls("DELETE", `/alerts/${SPORT_FRANCE.id}`)).toHaveLength(1));
  });

  it("creates an alert from a theme and a local zone with its region", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "POST" ? jsonResponse(201, SPORT_FRANCE) : jsonResponse(200, []),
    );
    await renderWithProviders(<AlertsScreen />);
    await screen.findByText("Aucune alerte pour l'instant.");
    await fireEvent.press(screen.getByText("Sport"));
    await fireEvent.press(screen.getByText("Local"));
    await fireEvent.changeText(screen.getByLabelText("Région (facultatif)"), "Bretagne");
    await fireEvent.press(screen.getByText("Créer l'alerte"));

    await waitFor(() => expect(calls("POST", "/alerts")).toHaveLength(1));
    const body = calls("POST", "/alerts")[0]?.[1]?.body;
    expect(typeof body === "string" ? JSON.parse(body) : null).toEqual({
      theme: "SPORT",
      zone: "LOCAL",
      region: "Bretagne",
    });
  });

  it("explains the limit of 10 alerts", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "POST"
        ? jsonResponse(409, { code: "ALERTS_LIMIT_REACHED", message: "At most 10 alerts" })
        : jsonResponse(200, []),
    );
    await renderWithProviders(<AlertsScreen />);
    await screen.findByText("Aucune alerte pour l'instant.");
    await fireEvent.press(screen.getByText("Politique"));
    await fireEvent.press(screen.getByText("Créer l'alerte"));
    expect(
      await screen.findByText(
        "Vous avez déjà 10 alertes : supprimez-en une pour en créer une autre.",
      ),
    ).toBeTruthy();
  });
});
