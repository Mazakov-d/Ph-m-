import { Stack } from "expo-router";
import { useGoToTab } from "../components/navigation/useGoToTab";
import { CenteredBox } from "../components/ui/CenteredBox";
import { AuthPanel } from "../features/auth/components/AuthPanel";
import { LegalLinks } from "../features/legal/LegalLinks";

const texts = { title: "Se connecter" };

/** Opened from « Connectez-vous pour commenter » and the like: the same box as the account tab. */
export default function LoginScreen() {
  const goToTab = useGoToTab();
  return (
    <CenteredBox footer={<LegalLinks />}>
      <Stack.Screen options={{ title: texts.title }} />
      <AuthPanel initialMode="login" onSuccess={() => goToTab("/")} />
    </CenteredBox>
  );
}
