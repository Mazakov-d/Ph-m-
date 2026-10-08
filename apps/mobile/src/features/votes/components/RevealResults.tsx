import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors } from "../../../components/ui/theme";

const texts = {
  reveal: "Voir sans voter",
  warning: "Après avoir vu les résultats, vous ne pourrez plus voter sur cette opinion.",
  confirm: "Voir les résultats",
  cancel: "Annuler",
};

/** SPEC §7: « Voir sans voter » is final, so it asks for a confirmation first. */
export function RevealResults({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setConfirming(true)}>
        <Text style={styles.link}>{texts.reveal}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.confirm}>
      <Text>{texts.warning}</Text>
      <Button label={texts.confirm} loading={loading} onPress={onConfirm} />
      <Button label={texts.cancel} variant="secondary" onPress={() => setConfirming(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brand, fontWeight: "600", textAlign: "center" },
  confirm: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: colors.notice },
});
