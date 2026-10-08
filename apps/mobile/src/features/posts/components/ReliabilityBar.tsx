import { type PostSummaryPublic, reliabilityLabel } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../components/ui/theme";

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
  reliability: { backgroundColor: colors.subtle },
  opinion: { backgroundColor: colors.opinionTint },
  text: { fontSize: 13 },
});
