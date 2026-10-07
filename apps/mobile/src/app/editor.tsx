import { can } from "@fama/shared";
import { Link, Stack, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../components/ui/Button";
import { useMyEditorApplication } from "../features/editors/api";
import { ApplicationStatus } from "../features/editors/components/ApplicationStatus";
import { EditorApplicationForm } from "../features/editors/components/EditorApplicationForm";
import { IdentityVisibilitySwitch } from "../features/editors/components/IdentityVisibilitySwitch";
import { editorErrorMessage } from "../features/editors/texts";
import { useAuth } from "../providers/AuthProvider";

const texts = {
  title: "Espace éditeur",
  signInFirst: "Connectez-vous pour demander le statut éditeur.",
  signIn: "Se connecter",
  notForRole: "Le statut éditeur n'est pas disponible pour votre rôle.",
  publicProfile: "Voir mon profil public",
};

export default function EditorSpaceScreen() {
  const router = useRouter();
  const { user, status } = useAuth();
  const application = useMyEditorApplication(status === "authenticated");
  // SPEC §2.5 + docs/DECISIONS.md: only readers apply (the API checks again).
  const canApply = can(user, "editor.apply");

  const content = () => {
    if (status !== "authenticated" || !user) {
      return (
        <>
          <Text>{texts.signInFirst}</Text>
          <Button label={texts.signIn} onPress={() => router.push("/login")} />
        </>
      );
    }
    if (application.isPending) {
      return <ActivityIndicator />;
    }
    if (application.error) {
      return <Text style={styles.error}>{editorErrorMessage(application.error)}</Text>;
    }
    const current = application.data;
    if (!current) {
      return canApply ? <EditorApplicationForm /> : <Text>{texts.notForRole}</Text>;
    }
    const isValidated = current.status === "INDEPENDENT" || current.status === "CERTIFIED";
    return (
      <>
        <ApplicationStatus application={current} />
        {current.status === "REJECTED" && canApply ? <EditorApplicationForm /> : null}
        {current.status !== "REJECTED" ? (
          <IdentityVisibilitySwitch value={current.showIdentityPublicly} />
        ) : null}
        {isValidated ? (
          <Link href={`/editors/${user.id}`} style={styles.link}>
            {texts.publicProfile}
          </Link>
        ) : null}
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      {content()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 24 },
  error: { color: "#c1121f" },
  link: { color: "#1d3557" },
});
