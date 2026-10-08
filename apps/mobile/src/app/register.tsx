import { Link, Stack } from "expo-router";
import { useGoToTab } from "../components/navigation/useGoToTab";
import { ScrollView, StyleSheet, Text } from "react-native";
import { RegisterForm } from "../features/auth/components/RegisterForm";
import { LegalLinks } from "../features/legal/LegalLinks";
import { colors } from "../components/ui/theme";

const texts = {
  title: "Créer un compte",
  toLogin: "Déjà un compte ? Se connecter",
  consent:
    "En créant un compte, vous acceptez les règles de la communauté et la politique de confidentialité.",
};

export default function RegisterScreen() {
  const goToTab = useGoToTab();
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      <Text style={styles.consent}>{texts.consent}</Text>
      <RegisterForm onSuccess={() => goToTab("/")} />
      <Link href="/login" replace style={styles.link}>
        {texts.toLogin}
      </Link>
      <LegalLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  link: { color: colors.brand, textAlign: "center" },
  consent: { color: colors.muted },
});
