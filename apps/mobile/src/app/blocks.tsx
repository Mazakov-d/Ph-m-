import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { useBlocks, useUnblockUser } from "../features/users/api";

const texts = {
  title: "Comptes bloqués",
  intro: "Vous ne voyez ni les publications ni les commentaires de ces comptes.",
  empty: "Vous n'avez bloqué aucun compte.",
  unblock: "Débloquer",
};

/** SPEC §10: the accounts the user blocked, and unblocking. */
export default function BlocksScreen() {
  const blocks = useBlocks();
  const unblock = useUnblockUser();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: texts.title }} />
      <Text>{texts.intro}</Text>
      {blocks.isPending ? <ActivityIndicator /> : null}
      {blocks.data?.length === 0 ? <Text>{texts.empty}</Text> : null}
      {blocks.data?.map((block) => (
        <View key={block.blockedUserId} style={styles.row}>
          <Text style={styles.pseudo}>{block.blockedPseudo}</Text>
          <Button
            label={texts.unblock}
            variant="secondary"
            loading={unblock.isPending && unblock.variables === block.blockedUserId}
            onPress={() => unblock.mutate(block.blockedUserId)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pseudo: { fontWeight: "600", flex: 1 },
});
