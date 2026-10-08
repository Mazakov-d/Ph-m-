import { can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { useAllTickets } from "../../features/tickets/api";
import { TicketCard } from "../../features/tickets/components/TicketCard";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../components/ui/theme";

const texts = {
  title: "Toutes les conversations",
  forbidden: "Cet écran est réservé aux dirigeants.",
  notice: "Ouvrir une conversation enregistre votre lecture dans le journal d'audit.",
};

/** SPEC §2.4: an admin reads every conversation; each reading is audited. */
export default function AllConversationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const tickets = useAllTickets();
  if (!can(user, "chat.readAll")) {
    return <Text style={styles.message}>{texts.forbidden}</Text>;
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <Text style={styles.notice}>{texts.notice}</Text>
      {tickets.isPending ? <ActivityIndicator /> : null}
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
  notice: { color: colors.muted, fontStyle: "italic" },
  message: { padding: 24, textAlign: "center" },
});
