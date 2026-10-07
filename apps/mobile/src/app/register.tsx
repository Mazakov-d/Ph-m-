import { Link, Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { RegisterForm } from "../features/auth/components/RegisterForm";

const texts = {
  title: "Créer un compte",
  toLogin: "Déjà un compte ? Se connecter",
};

export default function RegisterScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      <RegisterForm onSuccess={() => router.replace("/")} />
      <Link href="/login" replace style={styles.link}>
        {texts.toLogin}
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  link: { color: "#1d3557", textAlign: "center" },
});
