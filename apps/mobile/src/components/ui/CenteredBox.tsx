import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView } from "./KeyboardAwareScrollView";
import { colors, radius, spacing } from "./theme";

/** Widest box for each kind of content: a few buttons, a form or a text, a list to work on. */
const BOX_WIDTHS = { narrow: 420, medium: 560, wide: 760 } as const;

// Below this window width (a phone), the box and its margins are tighter.
const NARROW_WINDOW_MAX_WIDTH = 480;

/** A box that grows with the window (the dashboard): a share of its width, within limits. */
const FLUID_BOX = { share: 0.7, min: 420, max: 1200 } as const;

type Props = {
  children: ReactNode;
  size?: keyof typeof BOX_WIDTHS | "fluid";
  /** Shown under the box (legal links). */
  footer?: ReactNode;
};

/**
 * Interface brief: the account and every page opened from it sit in one box in the middle of
 * the screen, as wide as their content needs.
 */
export function CenteredBox({ children, size = "narrow", footer }: Props) {
  const { width } = useWindowDimensions();
  const maxWidth =
    size === "fluid"
      ? Math.min(FLUID_BOX.max, Math.max(FLUID_BOX.min, width * FLUID_BOX.share))
      : BOX_WIDTHS[size];
  const narrow = width < NARROW_WINDOW_MAX_WIDTH;
  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.screen, narrow && styles.narrowScreen]}>
      <View style={[styles.box, narrow && styles.narrowBox, { maxWidth }]}>{children}</View>
      {footer}
    </KeyboardAwareScrollView>
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
  narrowScreen: { padding: spacing.md },
  narrowBox: { padding: spacing.lg },
  box: {
    width: "100%",
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
  },
});
