import { APP_SLOGAN } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors } from "../../../components/ui/theme";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export type AuthMode = "choice" | "login" | "register";

const texts = {
  anonymous: "Lisez le fil sans compte ; connectez-vous pour commenter, voter et signaler.",
  signIn: "Se connecter",
  register: "Créer un compte",
  toRegister: "Pas encore de compte ? En créer un",
  toLogin: "Déjà un compte ? Se connecter",
  consent:
    "En créant un compte, vous acceptez les règles de la communauté et la politique de confidentialité.",
};

type Props = { initialMode: AuthMode; onSuccess: () => void };

/**
 * Interface brief: signing in and signing up happen in the account box, under the slogan; the
 * buttons switch the box between the two forms.
 */
export function AuthPanel({ initialMode, onSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  return (
    <>
      <Text accessibilityRole="header" style={styles.slogan}>
        {APP_SLOGAN}
      </Text>
      {mode === "choice" ? (
        <>
          <Text style={styles.text}>{texts.anonymous}</Text>
          <Button label={texts.signIn} onPress={() => setMode("login")} />
          <Button label={texts.register} variant="secondary" onPress={() => setMode("register")} />
        </>
      ) : null}
      {mode === "login" ? (
        <>
          <Text style={styles.title}>{texts.signIn}</Text>
          <LoginForm onSuccess={onSuccess} />
          <SwitchLink label={texts.toRegister} onPress={() => setMode("register")} />
        </>
      ) : null}
      {mode === "register" ? (
        <>
          <Text style={styles.title}>{texts.register}</Text>
          <Text style={styles.text}>{texts.consent}</Text>
          <RegisterForm onSuccess={onSuccess} />
          <SwitchLink label={texts.toLogin} onPress={() => setMode("login")} />
        </>
      ) : null}
    </>
  );
}

function SwitchLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slogan: {
    fontSize: 22,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    color: colors.brand,
  },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", color: colors.text },
  text: { textAlign: "center", color: colors.muted },
  link: { color: colors.brand, fontWeight: "600", textAlign: "center" },
});
