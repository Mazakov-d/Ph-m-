import { can } from "@fama/shared";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { formatPublishedAt } from "../../features/posts/texts";
import { useAuditLogs } from "../../features/tickets/api";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../components/ui/theme";
import { CenteredBox } from "../../components/ui/CenteredBox";

const texts = {
  title: "Journal d'audit",
  forbidden: "Cet écran est réservé aux dirigeants.",
  more: "Voir plus",
};

/** SPEC §2.4: every moderation decision and every chat read by an admin, newest first. */
export default function AuditLogScreen() {
  const { user } = useAuth();
  const logs = useAuditLogs();
  if (!can(user, "audit.read")) {
    return <Text style={styles.message}>{texts.forbidden}</Text>;
  }
  const entries = logs.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CenteredBox size="wide">
      <Stack.Screen options={{ title: texts.title }} />
      {logs.isPending ? <ActivityIndicator /> : null}
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Text style={styles.action}>{entry.action}</Text>
          <Text style={styles.muted}>
            {`${entry.actorPseudo} · ${entry.targetType} ${entry.targetId ?? ""} · ${formatPublishedAt(entry.createdAt)}`}
          </Text>
          {entry.metadata ? (
            <Text style={styles.muted}>{JSON.stringify(entry.metadata)}</Text>
          ) : null}
        </View>
      ))}
      {logs.hasNextPage ? (
        <Button
          label={texts.more}
          variant="secondary"
          loading={logs.isFetchingNextPage}
          onPress={() => void logs.fetchNextPage()}
        />
      ) : null}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  entry: { gap: 2, padding: 12, borderRadius: 8, backgroundColor: colors.surface },
  action: { fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 12 },
  message: { padding: 24, textAlign: "center" },
});
