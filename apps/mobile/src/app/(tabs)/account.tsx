import { APP_SLOGAN, can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../components/ui/theme";
import { Button } from "../../components/ui/Button";
import { DeleteAccount } from "../../features/auth/components/DeleteAccount";
import { LegalLinks } from "../../features/legal/LegalLinks";
import { useAuth } from "../../providers/AuthProvider";

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
  support: "Parler à l'équipe",
  tickets: "Tickets",
  conversations: "Toutes les conversations",
  audit: "Journal d'audit",
};

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  // Interface brief: the account actions sit in a box in the middle of the screen.
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.box}>
        {status === "loading" ? <ActivityIndicator /> : null}
        {status === "anonymous" ? (
          <>
            <Text accessibilityRole="header" style={styles.slogan}>
              {APP_SLOGAN}
            </Text>
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
            <Button
              label={texts.blocks}
              variant="secondary"
              onPress={() => router.push("/blocks")}
            />
            {can(user, "moderation.queue.read") ? (
              <Button
                label={texts.moderation}
                onPress={() => router.push("/moderation/comments")}
              />
            ) : null}
            {can(user, "moderation.queue.read") ? (
              <Button
                label={texts.postReviews}
                onPress={() => router.push("/moderation/post-reviews")}
              />
            ) : null}
            <Button label={texts.signOut} variant="secondary" onPress={signOut} />
            <DeleteAccount />
          </>
        ) : null}
      </View>
      <LegalLinks />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
  },
  slogan: {
    fontSize: 22,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    color: colors.brand,
  },
  text: { textAlign: "center", color: colors.muted },
});
