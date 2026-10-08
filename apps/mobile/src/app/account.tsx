import { can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { useAuth } from "../providers/AuthProvider";

const texts = {
  title: "Compte",
  anonymous: "Lisez le fil sans compte ; connectez-vous pour commenter, voter et signaler.",
  signedInAs: (pseudo: string) => `Connecté en tant que ${pseudo}`,
  signIn: "Se connecter",
  register: "Créer un compte",
  signOut: "Se déconnecter",
  becomeEditor: "Devenir éditeur",
  editorSpace: "Mon espace éditeur",
  editorApplications: "Demandes éditeurs",
  postReviews: "Articles signalés",
  moderation: "Commentaires et opinions signalés",
  sanctions: "Mes sanctions",
  blocks: "Comptes bloqués",
};

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      {status === "loading" ? <ActivityIndicator /> : null}
      {status === "anonymous" ? (
        <>
          <Text style={styles.text}>{texts.anonymous}</Text>
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
          <Text style={styles.text}>{texts.signedInAs(user.pseudo)}</Text>
          {user.role === "READER" || user.role === "EDITOR" ? (
            <Button
              label={user.role === "EDITOR" ? texts.editorSpace : texts.becomeEditor}
              onPress={() => router.push("/editor")}
            />
          ) : null}
          {can(user, "editor.validateIndependent") ? (
            <Button
              label={texts.editorApplications}
              onPress={() => router.push("/moderation/editor-applications")}
            />
          ) : null}
          <Button
            label={texts.sanctions}
            variant="secondary"
            onPress={() => router.push("/sanctions")}
          />
          <Button label={texts.blocks} variant="secondary" onPress={() => router.push("/blocks")} />
          {can(user, "moderation.queue.read") ? (
            <Button label={texts.moderation} onPress={() => router.push("/moderation/comments")} />
          ) : null}
          {can(user, "moderation.queue.read") ? (
            <Button
              label={texts.postReviews}
              onPress={() => router.push("/moderation/post-reviews")}
            />
          ) : null}
          <Button label={texts.signOut} variant="secondary" onPress={signOut} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, alignSelf: "center", width: "100%", maxWidth: 480 },
  text: { textAlign: "center" },
});
