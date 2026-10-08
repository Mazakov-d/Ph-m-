import { can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useGoToTab } from "../../components/navigation/useGoToTab";
import { CenteredBox } from "../../components/ui/CenteredBox";
import { colors } from "../../components/ui/theme";
import { Button } from "../../components/ui/Button";
import { AuthPanel } from "../../features/auth/components/AuthPanel";
import { DeleteAccount } from "../../features/auth/components/DeleteAccount";
import { LegalLinks } from "../../features/legal/LegalLinks";
import { useAuth } from "../../providers/AuthProvider";

const texts = {
  title: "Compte",
  signedInAs: (pseudo: string) => `Connecté en tant que ${pseudo}`,
  signOut: "Se déconnecter",
  becomeEditor: "Devenir éditeur",
  editorSpace: "Mon espace éditeur",
  editorApplications: "Demandes éditeurs",
  postReviews: "Articles signalés",
  moderation: "Commentaires et opinions signalés",
  sanctions: "Mes sanctions",
  blocks: "Comptes bloqués",
  alerts: "Mes alertes",
  support: "Parler à l'équipe",
  tickets: "Tickets",
  conversations: "Toutes les conversations",
  audit: "Journal d'audit",
};

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, signOut } = useAuth();
  const goToTab = useGoToTab();

  // Interface brief: the account actions sit in a box in the middle of the screen.
  return (
    <CenteredBox footer={<LegalLinks />}>
      <Stack.Screen options={{ title: texts.title }} />
      {status === "loading" ? <ActivityIndicator /> : null}
      {status === "anonymous" ? (
        <AuthPanel initialMode="choice" onSuccess={() => goToTab("/")} />
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
          <Button label={texts.alerts} variant="secondary" onPress={() => router.push("/alerts")} />
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
          <DeleteAccount />
        </>
      ) : null}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: "center", color: colors.muted },
});
