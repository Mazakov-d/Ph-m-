import { Stack } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CenteredBox } from "../components/ui/CenteredBox";
import { colors, spacing } from "../components/ui/theme";
import { useAlerts, useDeleteAlert } from "../features/notifications/api";
import { AlertForm } from "../features/notifications/components/AlertForm";
import { alertErrorMessage, alertLabel } from "../features/notifications/texts";

const texts = {
  title: "Mes alertes",
  intro: "Recevez une notification quand une publication correspond à une de vos alertes.",
  webNote: "Les notifications arrivent sur l'application iPhone et Android.",
  empty: "Aucune alerte pour l'instant.",
  remove: (label: string) => `Supprimer l'alerte ${label}`,
};

/** docs/DECISIONS.md (push notifications): the reader's alerts on new posts. */
export default function AlertsScreen() {
  const alerts = useAlerts();
  const deleteAlert = useDeleteAlert();

  return (
    <CenteredBox size="medium">
      <Stack.Screen options={{ title: texts.title }} />
      <Text accessibilityRole="header" style={styles.title}>
        {texts.title}
      </Text>
      <Text style={styles.muted}>{texts.intro}</Text>
      {Platform.OS === "web" ? <Text style={styles.muted}>{texts.webNote}</Text> : null}
      {alerts.isPending ? <ActivityIndicator /> : null}
      {alerts.error ? <Text style={styles.error}>{alertErrorMessage(alerts.error)}</Text> : null}
      {alerts.data?.length === 0 ? <Text>{texts.empty}</Text> : null}
      {alerts.data?.map((alert) => {
        const label = alertLabel(alert);
        return (
          <View key={alert.id} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.remove(label)}
              hitSlop={8}
              onPress={() => deleteAlert.mutate(alert.id)}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
        );
      })}
      <AlertForm />
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold", color: colors.text },
  muted: { color: colors.muted },
  error: { color: colors.danger },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: { fontWeight: "600", color: colors.text },
  remove: { fontSize: 16, color: colors.danger, paddingHorizontal: spacing.sm },
});
