import { type PostSummaryPublic, reliabilityLabel } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";

const texts = { opinion: "Opinion" };

/** SPEC §5.6: reliability bar of an article, or the « Opinion » label (opinions have no bar). */
export function ReliabilityBar({ post }: { post: PostSummaryPublic }) {
  const label = reliabilityLabel(post);
  return (
    <View style={[styles.bar, label === null ? styles.opinion : styles.reliability]}>
      <Text style={styles.text}>{label ?? texts.opinion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  reliability: { backgroundColor: "#e9ecef" },
  opinion: { backgroundColor: "#fde2c8" },
  text: { fontSize: 13 },
});
