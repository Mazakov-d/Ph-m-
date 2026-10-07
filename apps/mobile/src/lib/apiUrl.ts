import Constants from "expo-constants";

const DEFAULT_API_PORT = 3000;

/**
 * Base URL of the API:
 * 1. EXPO_PUBLIC_API_URL when set (staging, production);
 * 2. in development, the machine running the Expo server, so a phone on the same Wi-Fi
 *    (Expo Go) reaches the API without configuration;
 * 3. localhost otherwise (web, simulators).
 */
export function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const devServerHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${devServerHost ?? "localhost"}:${DEFAULT_API_PORT}`;
}
