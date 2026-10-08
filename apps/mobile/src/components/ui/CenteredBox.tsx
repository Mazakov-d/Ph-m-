import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "./theme";

type Props = { children: ReactNode; /** Shown under the box (legal links). */ footer?: ReactNode };

/** Interface brief: the account pages sit in one box in the middle of the screen. */
export function CenteredBox({ children, footer }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.box}>{children}</View>
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
  },
});
