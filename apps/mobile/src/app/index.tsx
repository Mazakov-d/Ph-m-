import { APP_NAME, APP_SLOGAN } from "@fama/shared";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { useAuth } from "../providers/AuthProvider";

const texts = {
  signedInAs: (pseudo: string) => `Connecté en tant que ${pseudo}`,
  signIn: "Se connecter",
  register: "Créer un compte",
  signOut: "Se déconnecter",
  becomeEditor: "Devenir éditeur",
  editorSpace: "Mon espace éditeur",
};

export default function HomeScreen() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.slogan}>{APP_SLOGAN}</Text>
      <View style={styles.actions}>
        {status === "loading" ? <ActivityIndicator /> : null}
        {status === "anonymous" ? (
          <>
            <Button label={texts.signIn} onPress={() => router.push("/login")} />
            <Button
              label={texts.register}
              variant="secondary"
              onPress={() => router.push("/register")}
            />
          </>
        ) : null}
        {status === "authenticated" && user ? (
          <>
            <Text style={styles.signedIn}>{texts.signedInAs(user.pseudo)}</Text>
            {user.role === "READER" || user.role === "EDITOR" ? (
              <Button
                label={user.role === "EDITOR" ? texts.editorSpace : texts.becomeEditor}
                onPress={() => router.push("/editor")}
              />
            ) : null}
            <Button label={texts.signOut} variant="secondary" onPress={signOut} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  title: { fontSize: 32, fontWeight: "bold" },
  slogan: { fontSize: 16, fontStyle: "italic" },
  actions: { marginTop: 32, gap: 12, alignSelf: "stretch", maxWidth: 400, width: "100%" },
  signedIn: { textAlign: "center" },
});
