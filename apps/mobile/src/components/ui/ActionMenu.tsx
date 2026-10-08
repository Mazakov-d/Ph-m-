import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./theme";

export type MenuAction = { label: string; onPress: () => void };

const texts = { cancel: "Annuler" };

type Props = { accessibilityLabel: string; actions: MenuAction[] };

/**
 * A « ⋯ » button that opens a short list of actions (interface brief). Nothing is shown when
 * there is no action to offer.
 */
export function ActionMenu({ accessibilityLabel, actions }: Props) {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) {
    return null;
  }
  const choose = (action: MenuAction) => {
    setOpen(false);
    action.onPress();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.dots}>⋯</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* A press outside the list closes it. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View accessibilityViewIsModal style={styles.sheet}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => choose(action)}
                style={styles.item}
              >
                <Text style={styles.label}>{action.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={styles.item}
            >
              <Text style={styles.cancel}>{texts.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { marginLeft: "auto", paddingHorizontal: spacing.sm },
  dots: { fontSize: 20, lineHeight: 20, color: colors.muted },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: { fontSize: 16, color: colors.brand, fontWeight: "600" },
  cancel: { fontSize: 16, color: colors.muted },
});
