import type { TicketModeration, TicketPublic } from "@fama/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatPublishedAt } from "../../posts/texts";
import {
  TICKET_AUDIENCE_LABELS,
  TICKET_KIND_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TOPIC_LABELS,
} from "../texts";
import { colors } from "../../../components/ui/theme";

const texts = {
  waiting: "Nouvelle réponse",
  handledBy: (pseudo: string) => `Pris en charge par ${pseudo}`,
  unhandled: "Personne ne l'a encore pris en charge",
};

type Props = {
  ticket: TicketPublic | TicketModeration;
  onPress: () => void;
  action?: ReactNode;
};

/** A ticket in a list; the team sees who opened it and its first message. */
export function TicketCard({ ticket, onPress, action }: Props) {
  const team = "openedByPseudo" in ticket ? ticket : null;
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.body}>
        <Text style={styles.meta}>
          {[
            team ? TICKET_AUDIENCE_LABELS[team.audience] : null,
            ticket.topic ? TICKET_TOPIC_LABELS[ticket.topic] : TICKET_KIND_LABELS[ticket.kind],
            TICKET_STATUS_LABELS[ticket.status],
            formatPublishedAt(ticket.lastMessageAt),
          ]
            .filter((part) => part !== null)
            .join(" · ")}
        </Text>
        {team ? <Text style={styles.who}>{team.editorPseudo ?? team.openedByPseudo}</Text> : null}
        {team ? <Text numberOfLines={2}>{team.firstMessage}</Text> : null}
        {/* docs/DECISIONS.md (contact): who handles the ticket. */}
        {team ? (
          <Text style={styles.meta}>
            {team.assignedModeratorPseudo
              ? texts.handledBy(team.assignedModeratorPseudo)
              : texts.unhandled}
          </Text>
        ) : null}
        {/* docs/DECISIONS.md (chats): someone answered and waits for the team. */}
        {team?.awaitingTeam && team.assignedModeratorId ? (
          <Text style={styles.waiting}>{texts.waiting}</Text>
        ) : null}
      </Pressable>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 8, backgroundColor: colors.surface },
  body: { gap: 4 },
  meta: { color: colors.muted },
  who: { fontWeight: "600" },
  waiting: { color: colors.danger, fontWeight: "600" },
});
