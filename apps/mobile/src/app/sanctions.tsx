import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { useMySanctions } from "../features/sanctions/api";
import { SanctionCard } from "../features/sanctions/components/SanctionCard";
import { sanctionErrorMessage } from "../features/sanctions/texts";

const texts = {
  title: "Mes sanctions",
  empty: "Vous n'avez aucune sanction.",
};

/** SPEC §6.3: the sanctions of the signed-in account, each contestable once. */
export default function SanctionsScreen() {
  const sanctions = useMySanctions();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      {sanctions.isPending ? <ActivityIndicator /> : null}
      {sanctions.error ? <Text>{sanctionErrorMessage(sanctions.error)}</Text> : null}
      {sanctions.data?.length === 0 ? <Text>{texts.empty}</Text> : null}
      {sanctions.data?.map((sanction) => (
        <SanctionCard key={sanction.id} sanction={sanction} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
});
