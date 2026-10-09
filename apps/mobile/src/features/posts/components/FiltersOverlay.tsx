import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useKeyboard } from "../../../hooks/useKeyboard";
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
  const keyboard = useKeyboard();
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  return (
    // The overlay reaches the bottom of the window: it stops at the keyboard's top instead, so
    // that every filter can be scrolled to and pressed while the keyboard stays open.
    <View
      style={[StyleSheet.absoluteFill, { paddingBottom: keyboard.height }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0, 0, 0, 0.15)" },
  // Sized to the panel, but never taller than the room left above the keyboard.
  scroll: { flexGrow: 0 },
  content: { paddingBottom: 16 },
});
