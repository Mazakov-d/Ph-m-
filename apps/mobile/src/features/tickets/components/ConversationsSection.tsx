import { can, type TicketModeration } from "@fama/shared";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, spacing } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { useAllTickets, useModeratorTickets, useTicketAction } from "../api";
import { conversationPath, ticketErrorMessage } from "../texts";
import { TicketCard } from "./TicketCard";

const texts = {
  all: "Toutes les conversations",
  unassigned: "À prendre en charge",
  mine: "Mes conversations",
  empty: "Aucune conversation.",
  claim: "Prendre en charge",
  groups: { EDITOR: "Éditeurs", READER: "Lecteurs" },
};

/**
 * docs/DECISIONS.md (chats): in the account, an ADMIN lists every open conversation; a
 * moderator takes one in charge (it leaves the shared list) and finds their own, marked when
 * an answer waits. A chat with an editor opens on the editor's page.
 */
export function ConversationsSection() {
  const { user } = useAuth();
  if (can(user, "chat.readAll")) return <AllConversations />;
  if (can(user, "ticket.assign")) return <ModeratorConversations />;
  return null;
}

function AllConversations() {
  const tickets = useAllTickets();
  const open = (tickets.data ?? []).filter((ticket) => ticket.status !== "CLOSED");
  return (
    <TicketList
      title={texts.all}
      tickets={open}
      loading={tickets.isPending}
      error={tickets.error}
    />
  );
}

function ModeratorConversations() {
  const unassigned = useModeratorTickets("unassigned");
  const mine = useModeratorTickets("mine");
  const assign = useTicketAction("assign");
  return (
    <>
      <TicketList
        title={texts.unassigned}
        tickets={unassigned.data ?? []}
        loading={unassigned.isPending}
        error={unassigned.error ?? assign.error}
        action={(ticket) => (
          <Button
            label={texts.claim}
            variant="secondary"
            loading={assign.isPending && assign.variables === ticket.id}
            onPress={() => assign.mutate(ticket.id)}
          />
        )}
      />
      <TicketList
        title={texts.mine}
        tickets={mine.data ?? []}
        loading={mine.isPending}
        error={mine.error}
      />
    </>
  );
}

type ListProps = {
  title: string;
  tickets: TicketModeration[];
  loading: boolean;
  error: Error | null;
  action?: (ticket: TicketModeration) => ReactNode;
};

function TicketList({ title, tickets, loading, error, action }: ListProps) {
  const router = useRouter();
  // docs/DECISIONS.md (contact): editors' tickets and readers' tickets apart.
  const groups = (["EDITOR", "READER"] as const).map((audience) => ({
    audience,
    tickets: tickets.filter((ticket) => ticket.audience === audience),
  }));
  return (
    <View style={styles.list}>
      <Text style={styles.title}>{title}</Text>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{ticketErrorMessage(error)}</Text> : null}
      {!loading && tickets.length === 0 ? <Text style={styles.muted}>{texts.empty}</Text> : null}
      {groups.map((group) =>
        group.tickets.length > 0 ? (
          <View key={group.audience} style={styles.list}>
            <Text style={styles.group}>{texts.groups[group.audience]}</Text>
            {group.tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => router.push(conversationPath(ticket))}
                action={action?.(ticket)}
              />
            ))}
          </View>
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  title: { fontWeight: "bold", color: colors.text },
  muted: { color: colors.muted },
  group: { color: colors.muted, fontWeight: "600" },
  error: { color: colors.danger },
});
