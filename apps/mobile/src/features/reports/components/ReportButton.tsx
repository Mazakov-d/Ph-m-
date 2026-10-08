import { can, type PostPublic } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { ReportPanel } from "./ReportPanel";
import { colors } from "../../../components/ui/theme";

const texts = {
  report: "Signaler",
  reported: "Vous avez signalé cette publication.",
};

/**
 * SPEC §5.1: shown to signed-in readers who may report, never on one's own post, nor on an
 * article already reviewed (docs/DECISIONS.md: « Pourquoi ? » takes its place).
 */
export function ReportButton({ post }: { post: PostPublic }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isOwnPost = user?.id === post.editor.id;
  if (!can(user, "report.create") || isOwnPost || post.reviewStatus === "REVIEWED") {
    return null;
  }
  if (post.viewerHasReported) {
    return <Text style={styles.reported}>{texts.reported}</Text>;
  }
  if (open) {
    return <ReportPanel postId={post.id} onClose={() => setOpen(false)} />;
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
      <Text style={styles.link}>{texts.report}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.danger, fontWeight: "600" },
  reported: { color: colors.muted, fontStyle: "italic" },
});
