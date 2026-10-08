import { can } from "@fama/shared";
import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { formatPublishedAt } from "../../features/posts/texts";
import { useAuditLogs } from "../../features/tickets/api";
import { useAuth } from "../../providers/AuthProvider";

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
    <ScrollView contentContainerStyle={styles.container}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, width: "100%", maxWidth: 720, alignSelf: "center" },
  entry: { gap: 2, padding: 12, borderRadius: 8, backgroundColor: "#fff" },
  action: { fontWeight: "600" },
  muted: { color: "#555", fontSize: 12 },
  message: { padding: 24, textAlign: "center" },
});
