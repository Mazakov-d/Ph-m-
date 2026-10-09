import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** The on-screen keyboard: its height (0 when hidden) and the window's y of its top edge. */
export type KeyboardState = { height: number; top: number };

const HIDDEN: KeyboardState = { height: 0, top: 0 };

/**
 * Follows the on-screen keyboard. The window does not shrink under it (Android draws edge to
 * edge, iOS never shrinks it), so the screens leave this much room themselves.
 */
export function useKeyboard(): KeyboardState {
  const [keyboard, setKeyboard] = useState<KeyboardState>(HIDDEN);
  useEffect(() => {
    // iOS announces the keyboard before it moves (smoother); Android only after.
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subscriptions = [
      Keyboard.addListener(show, (event) =>
        setKeyboard({ height: event.endCoordinates.height, top: event.endCoordinates.screenY }),
      ),
      Keyboard.addListener(hide, () => setKeyboard(HIDDEN)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return keyboard;
}
