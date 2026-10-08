import { Link, Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { RegisterForm } from "../features/auth/components/RegisterForm";
import { LegalLinks } from "../features/legal/LegalLinks";

const texts = {
  title: "Créer un compte",
  toLogin: "Déjà un compte ? Se connecter",
  consent:
    "En créant un compte, vous acceptez les règles de la communauté et la politique de confidentialité.",
};

export default function RegisterScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      <Text style={styles.consent}>{texts.consent}</Text>
      <RegisterForm onSuccess={() => router.replace("/")} />
      <Link href="/login" replace style={styles.link}>
        {texts.toLogin}
      </Link>
      <LegalLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  link: { color: "#1d3557", textAlign: "center" },
  consent: { color: "#555" },
});
