import type { PushPlatform } from "@fama/shared";
import Constants from "expo-constants";
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from "expo-notifications";
import { Platform } from "react-native";

/**
 * docs/DECISIONS.md (push notifications): the phone's side. Nothing happens on the web, nor
 * before the app has an EAS project id (Expo needs it to give a push token).
 */

// A notification that arrives while the app is open is shown too.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** The push token of this phone once registered, to unregister it on sign-out. */
let registeredToken: string | null = null;

export function currentPushToken(): string | null {
  return registeredToken;
}

export function forgetPushToken(): void {
  registeredToken = null;
}

function platformOf(): PushPlatform | null {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return null;
}

/**
 * Asks for the permission (once) and returns this phone's Expo push token, or null when there
 * is none: web, simulator, permission refused, or no EAS project yet.
 */
export async function obtainPushToken(): Promise<{ token: string; platform: PushPlatform } | null> {
  const platform = platformOf();
  const projectId: unknown =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!platform || typeof projectId !== "string") return null;
  if (platform === "ANDROID") {
    await setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await getPermissionsAsync();
  const permission = current.granted ? current : await requestPermissionsAsync();
  if (!permission.granted) return null;
  try {
    const { data } = await getExpoPushTokenAsync({ projectId });
    registeredToken = data;
    return { token: data, platform };
  } catch {
    // A simulator has no push token.
    return null;
  }
}
