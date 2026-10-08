import { Typeface } from "@fama/shared";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, radius, spacing } from "../../../components/ui/theme";
import {
  fontFamilyOf,
  TYPEFACE_CATEGORIES,
  TYPEFACES,
  useTypeface,
} from "../../../components/ui/typefaces";

const texts = {
  open: (field: string) => `Choisir la police du champ ${field}`,
  title: (field: string) => `Police : ${field}`,
  close: "Fermer",
};

type Props = { label: string; value: Typeface; onChange: (typeface: Typeface) => void };

/**
 * Interface brief: the typeface of a text block, chosen in a list of well-known fonts, each name
 * written in its own font.
 */
export function TypefacePicker({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const choose = (typeface: Typeface) => {
    onChange(typeface);
    setOpen(false);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={texts.open(label)}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <TypefaceName typeface={value} />
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>
              {texts.title(label)}
            </Text>
            <ScrollView contentContainerStyle={styles.list}>
              {TYPEFACE_CATEGORIES.map(({ category, label: heading }) => (
                <View key={category} style={styles.group}>
                  <Text style={styles.heading}>{heading}</Text>
                  {Typeface.options
                    .filter((typeface) => TYPEFACES[typeface].category === category)
                    .map((typeface) => (
                      <Pressable
                        key={typeface}
                        accessibilityRole="button"
                        accessibilityState={{ selected: typeface === value }}
                        onPress={() => choose(typeface)}
                        style={[styles.option, typeface === value && styles.selected]}
                      >
                        <TypefaceName typeface={typeface} />
                      </Pressable>
                    ))}
                </View>
              ))}
            </ScrollView>
            <Button label={texts.close} variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** The name of a typeface, written in it once downloaded. */
function TypefaceName({ typeface }: { typeface: Typeface }) {
  const ready = useTypeface(typeface, true);
  return (
    <Text
      style={[
        styles.name,
        ready ? { fontFamily: fontFamilyOf(typeface, { bold: false, italic: false }) } : null,
      ]}
    >
      {TYPEFACES[typeface].label}
    </Text>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chevron: { color: colors.muted },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    alignSelf: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 18, fontWeight: "bold", color: colors.text },
  list: { gap: spacing.lg },
  group: { gap: 2 },
  heading: { color: colors.muted, fontWeight: "600", marginBottom: spacing.xs },
  option: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  selected: { backgroundColor: colors.subtle },
  name: { fontSize: 17, color: colors.text },
});
