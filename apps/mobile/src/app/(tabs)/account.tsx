import { Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useGoToTab } from "../../components/navigation/useGoToTab";
import { CenteredBox } from "../../components/ui/CenteredBox";
import { Dashboard } from "../../features/account/components/Dashboard";
import { AuthPanel } from "../../features/auth/components/AuthPanel";
import { LegalLinks } from "../../features/legal/LegalLinks";
import { useAuth } from "../../providers/AuthProvider";

const texts = { title: "Tableau de bord" };

export default function AccountScreen() {
  const { status, user } = useAuth();
  const goToTab = useGoToTab();

  // Interface brief: the account sits in a box in the middle of the screen; the dashboard's box
  // grows with the window, the sign-in forms stay narrow.
  return (
    <CenteredBox size={user ? "fluid" : "narrow"} footer={<LegalLinks />}>
      <Stack.Screen options={{ title: texts.title }} />
      {status === "loading" ? <ActivityIndicator /> : null}
      {status === "anonymous" ? (
        <AuthPanel initialMode="choice" onSuccess={() => goToTab("/")} />
      ) : null}
      {status === "authenticated" && user ? <Dashboard user={user} /> : null}
    </CenteredBox>
  );
}
