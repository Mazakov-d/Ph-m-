import { Link, Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { LoginForm } from "../features/auth/components/LoginForm";
import { colors } from "../components/ui/theme";

const texts = {
  title: "Se connecter",
  toRegister: "Pas encore de compte ? En créer un",
};

export default function LoginScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      <LoginForm onSuccess={() => router.replace("/")} />
      <Link href="/register" replace style={styles.link}>
        {texts.toRegister}
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  link: { color: colors.brand, textAlign: "center" },
});
