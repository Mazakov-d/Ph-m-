import type { TicketModeration, TicketPublic } from "@fama/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatPublishedAt } from "../../posts/texts";
import { TICKET_KIND_LABELS, TICKET_STATUS_LABELS } from "../texts";

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
          {`${TICKET_KIND_LABELS[ticket.kind]} · ${TICKET_STATUS_LABELS[ticket.status]} · ${formatPublishedAt(ticket.lastMessageAt)}`}
        </Text>
        {team ? <Text style={styles.who}>{team.editorPseudo ?? team.openedByPseudo}</Text> : null}
        {team ? <Text numberOfLines={2}>{team.firstMessage}</Text> : null}
      </Pressable>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 8, backgroundColor: "#fff" },
  body: { gap: 4 },
  meta: { color: "#555" },
  who: { fontWeight: "600" },
});
