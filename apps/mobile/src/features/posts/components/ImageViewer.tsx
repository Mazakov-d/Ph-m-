import { Image, Modal, Pressable, StyleSheet, Text } from "react-native";
import { spacing } from "../../../components/ui/theme";

const texts = { close: "Fermer l'image" };

type Props = { uri: string | null; onClose: () => void };

/** Interface brief: a picture of a post, enlarged over the whole screen; a press closes it. */
export function ImageViewer({ uri, onClose }: Props) {
  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={texts.close}
        onPress={onClose}
        style={styles.backdrop}
      >
        {uri ? (
          <Image
            source={{ uri }}
            resizeMode="contain"
            style={styles.image}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.92)" },
  image: { width: "100%", height: "100%" },
  close: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.xl,
    fontSize: 26,
    color: "#ffffff",
  },
});
