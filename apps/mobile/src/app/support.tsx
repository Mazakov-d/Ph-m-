import { MESSAGE_MAX_LENGTH, TicketTopic } from "@fama/shared";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "../components/ui/Button";
import { CenteredBox } from "../components/ui/CenteredBox";
import { ChoiceChips } from "../components/ui/ChoiceChips";
import { TextField } from "../components/ui/TextField";
import { colors } from "../components/ui/theme";
import { useMyTickets, useOpenSupportTicket } from "../features/tickets/api";
import { TicketCard } from "../features/tickets/components/TicketCard";
import { TICKET_TOPIC_LABELS, ticketErrorMessage } from "../features/tickets/texts";

const texts = {
  title: "Contacter Phémé",
  intro: "Un problème, une idée, une question ? L'équipe de Phémé vous répond ici.",
  topic: "Pourquoi nous contactez-vous ?",
  message: "Votre message",
  send: "Envoyer",
  missing: "Choisissez un motif et écrivez votre message.",
  mine: "Mes conversations",
};

/**
 * SPEC §8 + docs/DECISIONS.md (contact): « Contacter Phémé » opens a SUPPORT ticket with its
 * reason; `?topic=` preselects one (« Ouvrir un compte éditeur » from the editor application).
 */
export default function SupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topic?: string }>();
  const tickets = useMyTickets();
  const open = useOpenSupportTicket();
  const [topic, setTopic] = useState<TicketTopic | undefined>(
    TicketTopic.safeParse(params.topic).data,
  );
  const [content, setContent] = useState("");
  const [missing, setMissing] = useState(false);

  const send = () => {
    const message = content.trim();
    setMissing(!topic || !message);
    if (!topic || !message) return;
    open.mutate(
      { topic, content: message },
      { onSuccess: (ticket) => router.push(`/tickets/${ticket.id}`) },
    );
  };

  return (
    <CenteredBox size="medium">
      <Stack.Screen options={{ title: texts.title }} />
      <Text accessibilityRole="header" style={styles.title}>
        {texts.title}
      </Text>
      <Text style={styles.muted}>{texts.intro}</Text>
      <ChoiceChips
        label={texts.topic}
        options={TicketTopic.options}
        labels={TICKET_TOPIC_LABELS}
        value={topic}
        onChange={setTopic}
      />
      <TextField
        label={texts.message}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={MESSAGE_MAX_LENGTH}
      />
      {missing ? <Text style={styles.error}>{texts.missing}</Text> : null}
      {open.error ? <Text style={styles.error}>{ticketErrorMessage(open.error)}</Text> : null}
      <Button label={texts.send} onPress={send} loading={open.isPending} />
      {tickets.data?.length ? <Text style={styles.heading}>{texts.mine}</Text> : null}
      {tickets.data?.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onPress={() => router.push(`/tickets/${ticket.id}`)}
        />
      ))}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold", color: colors.text },
  muted: { color: colors.muted },
  error: { color: colors.danger },
  heading: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
});
