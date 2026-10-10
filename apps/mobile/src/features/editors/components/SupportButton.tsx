import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";

const texts = {
  support: (pseudo: string) => `Soutenir ${pseudo}`,
  external: (host: string) => `Lien externe : ${host}`,
};

// The site the reader is sent to, shown before leaving the app (« fr.tipeee.com »).
const HOST_PATTERN = /^https:\/\/([^/?#]+)/;

/**
 * docs/DECISIONS.md (donations): opens the editor's own donation page; Phémé handles no payment.
 * Nothing when the editor gave no link.
 */
export function SupportButton({ pseudo, url }: { pseudo: string; url: string | null }) {
  const host = url ? HOST_PATTERN.exec(url)?.[1] : undefined;
  if (!url || !host) return null;
  return (
    <View style={styles.box}>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(url)}
        style={styles.button}
      >
        <Text style={styles.label}>{texts.support(pseudo)}</Text>
      </Pressable>
      <Text style={styles.host}>{texts.external(host)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, alignItems: "flex-start" },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    // Interface brief: the corners of the boxes (radius.md), like the « Sources » button.
    borderRadius: radius.md,
    backgroundColor: colors.success,
  },
  label: { color: colors.onBrand, fontWeight: "600" },
  host: { color: colors.muted, fontSize: 12 },
});
