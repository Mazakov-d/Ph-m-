import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { CenteredBox } from "../../components/ui/CenteredBox";
import { colors, spacing } from "../../components/ui/theme";
import { useModerators } from "../../features/moderators/api";
import { AddModeratorForm } from "../../features/moderators/components/AddModeratorForm";

const texts = {
  title: "Modérateurs",
  add: "+ Modérateur",
  close: "Annuler",
  empty: "Aucun modérateur pour l'instant.",
};

/** docs/DECISIONS.md (moderators): the ADMIN lists the moderators and adds new ones. */
export default function ModeratorsScreen() {
  const moderators = useModerators();
  const [adding, setAdding] = useState(false);
  return (
    <CenteredBox size="medium">
      <Stack.Screen options={{ title: texts.title }} />
      <Text accessibilityRole="header" style={styles.title}>
        {texts.title}
      </Text>
      {adding ? (
        <>
          <AddModeratorForm onDone={() => setAdding(false)} />
          <Button label={texts.close} variant="secondary" onPress={() => setAdding(false)} />
        </>
      ) : (
        <View style={styles.add}>
          <Button label={texts.add} onPress={() => setAdding(true)} />
        </View>
      )}
      {moderators.isPending ? <ActivityIndicator /> : null}
      {moderators.data?.length === 0 ? <Text style={styles.muted}>{texts.empty}</Text> : null}
      {moderators.data?.map((moderator) => (
        <View key={moderator.id} style={styles.row}>
          <Text style={styles.pseudo}>{moderator.pseudo}</Text>
          <Text style={styles.muted}>{moderator.email}</Text>
        </View>
      ))}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "bold", color: colors.text },
  add: { alignSelf: "flex-start" },
  row: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pseudo: { fontWeight: "600", color: colors.text },
  muted: { color: colors.muted },
});
