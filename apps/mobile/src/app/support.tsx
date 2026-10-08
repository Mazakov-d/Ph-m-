import { MESSAGE_MAX_LENGTH } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { TextActionForm } from "../components/ui/TextActionForm";
import { useMyTickets, useOpenSupportTicket } from "../features/tickets/api";
import { TicketCard } from "../features/tickets/components/TicketCard";
import { ticketErrorMessage } from "../features/tickets/texts";

const texts = {
  title: "Parler à l'équipe",
  intro: "Une question, une contestation, un problème ? L'équipe de modération vous répond ici.",
  open: "Écrire à l'équipe",
  send: "Envoyer",
  mine: "Mes conversations",
};

/** SPEC §8: « Parler à l'équipe » opens a SUPPORT ticket. */
export default function SupportScreen() {
  const router = useRouter();
  const tickets = useMyTickets();
  const open = useOpenSupportTicket();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      <Text>{texts.intro}</Text>
      <TextActionForm
        label={texts.open}
        submitLabel={texts.send}
        maxLength={MESSAGE_MAX_LENGTH}
        loading={open.isPending}
        error={open.error ? ticketErrorMessage(open.error) : undefined}
        onSubmit={(content, done) =>
          open.mutate(content, {
            onSuccess: (ticket) => {
              done();
              router.push(`/tickets/${ticket.id}`);
            },
          })
        }
      />
      {tickets.data?.length ? <Text style={styles.heading}>{texts.mine}</Text> : null}
      {tickets.data?.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onPress={() => router.push(`/tickets/${ticket.id}`)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  heading: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
});
