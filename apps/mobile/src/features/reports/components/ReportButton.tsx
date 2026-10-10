import { can, type PostPublic } from "@fama/shared";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { colors } from "../../../components/ui/theme";

const texts = {
  report: "Signaler",
  reported: "Vous avez signalé cette publication.",
};

/**
 * SPEC §5.1: shown to signed-in readers who may report, never on one's own post, nor on an
 * article already reviewed (docs/DECISIONS.md: « Pourquoi ? » takes its place). The page opens
 * the report form (`onOpen`) across its whole width.
 */
export function ReportButton({ post, onOpen }: { post: PostPublic; onOpen: () => void }) {
  const { user } = useAuth();
  const isOwnPost = user?.id === post.editor.id;
  if (!can(user, "report.create") || isOwnPost || post.reviewStatus === "REVIEWED") {
    return null;
  }
  if (post.viewerHasReported) {
    return <Text style={styles.reported}>{texts.reported}</Text>;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onOpen}>
      <Text style={styles.link}>{texts.report}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.danger, fontWeight: "600" },
  reported: { color: colors.muted, fontStyle: "italic" },
});
