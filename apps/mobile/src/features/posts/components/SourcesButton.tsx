import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import { SourcesList } from "./SourcesList";

const texts = {
  open: (count: number) => `Sources (${count})`,
  title: "Sources",
  close: "Fermer",
};

/** Interface brief: the sources stay folded behind a « Sources » button that opens a window. */
export function SourcesButton({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) {
    return null;
  }
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.button}>
        <Text style={styles.buttonLabel}>{texts.open(sources.length)}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>
              {texts.title}
            </Text>
            <ScrollView contentContainerStyle={styles.list}>
              <SourcesList sources={sources} />
            </ScrollView>
            <Button label={texts.close} variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.brand,
    // Interface brief: the corners of the boxes (radius.md), like « Soutenir ».
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  buttonLabel: { color: colors.brand, fontWeight: "600" },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "80%",
    alignSelf: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { fontSize: textSizes.cardTitle, fontWeight: "bold" },
  list: { gap: spacing.sm },
});
