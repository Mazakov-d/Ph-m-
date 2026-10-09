import { Platform, type TextInputProps } from "react-native";

/**
 * Props of a multi-line field where Enter sends (a chat, a comment) instead of starting a new
 * line. On a phone, the « send » key of the keyboard; on the web, Enter (Shift + Enter still goes
 * to the next line). The web ignores `submitBehavior`, hence the key handling there.
 */
export function submitOnEnter(send: () => void): TextInputProps {
  if (Platform.OS === "web") {
    return {
      onKeyPress: (event) => {
        const { key, shiftKey } = event.nativeEvent as { key: string; shiftKey?: boolean }; // the web's KeyboardEvent carries shiftKey.
        if (key === "Enter" && !shiftKey) {
          event.preventDefault();
          send();
        }
      },
    };
  }
  return { submitBehavior: "submit", returnKeyType: "send", onSubmitEditing: send };
}
