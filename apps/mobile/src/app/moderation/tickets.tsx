import { can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useModeratorTickets, useTicketAction } from "../../features/tickets/api";
import { TicketCard } from "../../features/tickets/components/TicketCard";
import { ticketErrorMessage } from "../../features/tickets/texts";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../components/ui/theme";

const texts = {
  title: "Tickets",
  forbidden: "Cet écran est réservé à l'équipe de modération.",
  unassigned: "Non attribués",
  mine: "Les miens",
  take: "Prendre en charge",
  empty: "Aucun ticket.",
};

type Scope = "unassigned" | "mine";

/** SPEC §8: unassigned tickets and the moderator's own; never another moderator's. */
export default function ModeratorTicketsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("unassigned");
  const tickets = useModeratorTickets(scope);
  const assign = useTicketAction("assign");
  if (!can(user, "ticket.assign")) {
    return <Text style={styles.message}>{texts.forbidden}</Text>;
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.tabs}>
        <Chip
          label={texts.unassigned}
          selected={scope === "unassigned"}
          onPress={() => setScope("unassigned")}
        />
        <Chip label={texts.mine} selected={scope === "mine"} onPress={() => setScope("mine")} />
      </View>
      {tickets.isPending ? <ActivityIndicator /> : null}
      {assign.error ? <Text style={styles.error}>{ticketErrorMessage(assign.error)}</Text> : null}
      {tickets.data?.length === 0 ? <Text style={styles.message}>{texts.empty}</Text> : null}
      {tickets.data?.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onPress={() => (scope === "mine" ? router.push(`/tickets/${ticket.id}`) : undefined)}
          action={
            scope === "unassigned" ? (
              <Button
                label={texts.take}
                loading={assign.isPending && assign.variables === ticket.id}
                onPress={() =>
                  assign.mutate(ticket.id, {
                    onSuccess: () => router.push(`/tickets/${ticket.id}`),
                  })
                }
              />
            ) : null
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  tabs: { flexDirection: "row", gap: 8 },
  message: { padding: 24, textAlign: "center" },
  error: { color: colors.danger },
});
