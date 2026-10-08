import { can } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../components/ui/Button";
import { useTicketAction } from "../../features/tickets/api";
import { Conversation } from "../../features/tickets/components/Conversation";
import { ticketErrorMessage } from "../../features/tickets/texts";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../components/ui/theme";
import { CenteredBox } from "../../components/ui/CenteredBox";

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
    <CenteredBox size="medium">
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
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  notice: { color: colors.muted, fontStyle: "italic" },
  error: { color: colors.danger },
});
