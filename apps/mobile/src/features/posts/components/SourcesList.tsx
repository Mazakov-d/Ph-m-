import { Linking, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../components/ui/theme";

function isWebLink(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

/** SPEC §3: sources are URLs (opened in the browser) or text references. */
export function SourcesList({ sources }: { sources: string[] }) {
  return (
    <View style={styles.list}>
      {sources.map((source, index) =>
        isWebLink(source) ? (
          <Text
            key={index}
            accessibilityRole="link"
            style={styles.link}
            onPress={() => void Linking.openURL(source)}
          >
            {source}
          </Text>
        ) : (
          <Text key={index}>{source}</Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  link: { color: colors.brand, textDecorationLine: "underline" },
});
