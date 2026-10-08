import { can } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../components/ui/Button";
import { useTicketAction } from "../../features/tickets/api";
import { Conversation } from "../../features/tickets/components/Conversation";
import { ticketErrorMessage } from "../../features/tickets/texts";
import { useAuth } from "../../providers/AuthProvider";

const texts = {
  title: "Conversation",
  close: "Fermer le ticket",
  audited:
    "En tant que dirigeant, votre lecture de cette conversation est enregistrée dans le journal d'audit.",
};

export default function TicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const close = useTicketAction("close");

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      {/* SPEC §2.4: an admin's reading is audited (the API records it). */}
      {can(user, "chat.readAll") ? <Text style={styles.notice}>{texts.audited}</Text> : null}
      <Conversation ticketId={id} />
      {can(user, "ticket.assign") ? (
        <Button
          label={texts.close}
          variant="secondary"
          loading={close.isPending}
          onPress={() => close.mutate(id, { onSuccess: () => router.back() })}
        />
      ) : null}
      {close.error ? <Text style={styles.error}>{ticketErrorMessage(close.error)}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  notice: { color: "#555", fontStyle: "italic" },
  error: { color: "#c1121f" },
});
