import { can, type EditorPublic } from "@fama/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { colors, gridBreakpoints, radius, spacing } from "../../components/ui/theme";
import { useEditorProfile } from "../../features/editors/api";
import { EditorBadge } from "../../features/editors/components/EditorBadge";
import { ReliabilityGauge } from "../../features/editors/components/ReliabilityGauge";
import { SupportButton } from "../../features/editors/components/SupportButton";
import { editorErrorMessage } from "../../features/editors/texts";
import { EditorPostsList } from "../../features/posts/components/EditorPostsList";
import { EditorChatPanel } from "../../features/tickets/components/EditorChatPanel";
import { ApiRequestError } from "../../lib/apiClient";
import { useAuth } from "../../providers/AuthProvider";

const texts = {
  title: "Profil éditeur",
  notFound: "Cet éditeur n'existe pas.",
  editorialLine: "Ligne éditoriale",
  owner: "Propriétaire",
  identity: "Identité",
};

/**
 * SPEC §2.2 + docs/DECISIONS.md (editor page): the editor's details in a box — centred for
 * readers; on the left for the moderation, with the chat on the right — then their posts in a
 * grid that follows the width of the window.
 */
export default function EditorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useEditorProfile(id);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const staff = can(user, "ticket.assign");
  const sideBySide = staff && width >= gridBreakpoints.twoColumns;

  const content = () => {
    if (profile.isPending) return <ActivityIndicator />;
    if (profile.error) {
      const notFound = profile.error instanceof ApiRequestError && profile.error.status === 404;
      return <Text>{notFound ? texts.notFound : editorErrorMessage(profile.error)}</Text>;
    }
    const editor = profile.data;
    return (
      <>
        <View style={sideBySide ? styles.top : styles.stack}>
          <EditorDetails editor={editor} centred={!staff} />
          {staff ? (
            <View style={sideBySide ? styles.side : null}>
              <EditorChatPanel editorId={editor.id} pseudo={editor.pseudo} />
            </View>
          ) : null}
        </View>
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

function EditorDetails({ editor, centred }: { editor: EditorPublic; centred: boolean }) {
  return (
    <View style={[styles.box, centred && styles.centred]}>
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
    </View>
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

const DETAILS_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.xl, width: "100%" },
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl },
  stack: { gap: spacing.lg },
  side: { flex: 1 },
  box: {
    width: "100%",
    maxWidth: DETAILS_MAX_WIDTH,
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
  },
  centred: { alignSelf: "center" },
  header: { gap: spacing.sm },
  pseudo: { fontSize: 24, fontWeight: "bold" },
  section: { gap: 4 },
  sectionTitle: { fontWeight: "600" },
});
