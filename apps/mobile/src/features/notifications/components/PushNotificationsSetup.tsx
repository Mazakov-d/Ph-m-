import { addNotificationResponseReceivedListener } from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { z } from "zod";
import { obtainPushToken } from "../../../lib/pushNotifications";
import { useAuth } from "../../../providers/AuthProvider";
import { registerPushToken } from "../api";

// The page a notification opens (set by the API).
const notificationDataSchema = z.object({ url: z.string().startsWith("/") });

/**
 * docs/DECISIONS.md (push notifications): registers the phone for the signed-in account, and
 * opens the right page when a notification is touched. Renders nothing.
 */
export function PushNotificationsSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;

  // Native permission and token: an external system, kept in sync with the session.
  useEffect(() => {
    if (!userId) return;
    void obtainPushToken()
      .then((phone) => (phone ? registerPushToken(phone.token, phone.platform) : undefined))
      // Without notifications the app works the same: nothing to tell the reader.
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = notificationDataSchema.safeParse(response.notification.request.content.data);
      if (data.success) router.push(data.data.url);
    });
    return () => subscription.remove();
  }, [router]);

  return null;
}
