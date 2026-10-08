import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { FeedFilters } from "../api";
import { FeedFiltersPanel } from "./FeedFiltersPanel";

const texts = { close: "Fermer les filtres" };

type Props = {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  onClose: () => void;
};

/**
 * Interface brief: the filters open over the feed, under the search bar. A press outside them
 * closes them; they stay above the keyboard and scroll when the keyboard leaves too little room.
 */
export function FiltersOverlay({ filters, onChange, onClose }: Props) {
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  return (
    <KeyboardAvoidingView
      // Android already resizes the window above the keyboard.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={texts.close}
        onPress={close}
        style={[StyleSheet.absoluteFill, styles.backdrop]}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FeedFiltersPanel filters={filters} onChange={onChange} onClose={close} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0, 0, 0, 0.15)" },
  // Sized to the panel, but never taller than the room left above the keyboard.
  scroll: { flexGrow: 0 },
  content: { paddingBottom: 16 },
});
