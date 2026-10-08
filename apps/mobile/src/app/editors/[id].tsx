import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEditorProfile } from "../../features/editors/api";
import { EditorBadge } from "../../features/editors/components/EditorBadge";
import { SupportButton } from "../../features/editors/components/SupportButton";
import { ReliabilityGauge } from "../../features/editors/components/ReliabilityGauge";
import { editorErrorMessage } from "../../features/editors/texts";
import { EditorPostsList } from "../../features/posts/components/EditorPostsList";
import { ContactEditor } from "../../features/tickets/components/ContactEditor";
import { ApiRequestError } from "../../lib/apiClient";

const texts = {
  title: "Profil éditeur",
  notFound: "Cet éditeur n'existe pas.",
  editorialLine: "Ligne éditoriale",
  owner: "Propriétaire",
  identity: "Identité",
};

export default function EditorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useEditorProfile(id);

  const content = () => {
    if (profile.isPending) {
      return <ActivityIndicator />;
    }
    if (profile.error) {
      const notFound = profile.error instanceof ApiRequestError && profile.error.status === 404;
      return <Text>{notFound ? texts.notFound : editorErrorMessage(profile.error)}</Text>;
    }
    const editor = profile.data;
    return (
      <>
        <View style={styles.header}>
          <Text style={styles.pseudo}>{editor.pseudo}</Text>
          <EditorBadge status={editor.editorStatus} />
          <ReliabilityGauge level={editor.reliability} />
        </View>
        <SupportButton pseudo={editor.pseudo} url={editor.donationUrl} />
        <Section title={texts.editorialLine} body={editor.editorialLine} />
        <Section
          title={texts.owner}
          body={editor.ownerGroup ? `${editor.ownerName} (${editor.ownerGroup})` : editor.ownerName}
        />
        {/* SPEC §2.2: shown only if the editor chose to. */}
        {editor.legalIdentity ? (
          <Section
            title={texts.identity}
            body={`${editor.legalIdentity.firstName} ${editor.legalIdentity.lastName}`}
          />
        ) : null}
        <ContactEditor editorId={editor.id} />
        <EditorPostsList editorId={editor.id} />
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      {content()}
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20 },
  header: { gap: 8 },
  pseudo: { fontSize: 24, fontWeight: "bold" },
  section: { gap: 4 },
  sectionTitle: { fontWeight: "600" },
});
