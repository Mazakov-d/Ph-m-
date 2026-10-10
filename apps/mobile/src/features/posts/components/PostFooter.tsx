import type { PostPublic } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../../components/ui/theme";
import { SupportButton } from "../../editors/components/SupportButton";
import { ReportButton } from "../../reports/components/ReportButton";
import { ReportPanel } from "../../reports/components/ReportPanel";
import { ReliabilityBar } from "./ReliabilityBar";
import { SourcesButton } from "./SourcesButton";

/**
 * Interface brief: the bottom of a post. On the left « Sources », then « Soutenir » under it; on
 * the right the status, then « Signaler » under it. The report form opens under both, across
 * the whole width.
 */
export function PostFooter({ post }: { post: PostPublic }) {
  const [reporting, setReporting] = useState(false);
  return (
    <>
      <View style={styles.columns}>
        <View style={styles.left}>
          <SourcesButton sources={post.sources} />
          <SupportButton pseudo={post.editor.pseudo} url={post.editorDonationUrl} />
        </View>
        {/* Pushed to the right even when the left column is empty (no sources, no donation). */}
        <View style={styles.right}>
          <ReliabilityBar post={post} />
          {reporting ? null : <ReportButton post={post} onOpen={() => setReporting(true)} />}
        </View>
      </View>
      {reporting ? <ReportPanel postId={post.id} onClose={() => setReporting(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  left: { flexShrink: 1, gap: spacing.sm, alignItems: "flex-start" },
  right: { marginLeft: "auto", gap: spacing.sm, alignItems: "flex-end" },
});
