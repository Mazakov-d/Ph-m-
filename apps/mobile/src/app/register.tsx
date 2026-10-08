import { Stack } from "expo-router";
import { useGoToTab } from "../components/navigation/useGoToTab";
import { CenteredBox } from "../components/ui/CenteredBox";
import { AuthPanel } from "../features/auth/components/AuthPanel";
import { LegalLinks } from "../features/legal/LegalLinks";

const texts = { title: "Créer un compte" };

/** The same box as the account tab, opened on the sign-up form. */
export default function RegisterScreen() {
  const goToTab = useGoToTab();
  return (
    <CenteredBox footer={<LegalLinks />}>
      <Stack.Screen options={{ title: texts.title }} />
      <AuthPanel initialMode="register" onSuccess={() => goToTab("/")} />
    </CenteredBox>
  );
}
