import { StyleSheet, View } from "react-native";
import { colors } from "../ui/theme";

const SIZE = 22;
const STROKE = 2.5;
const HEAD = 11;

/** A left-pointing arrow drawn with two lines (no icon font in the app). */
export function BackArrow() {
  return (
    <View style={styles.box}>
      <View style={styles.shaft} />
      <View style={styles.head} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
  shaft: {
    position: "absolute",
    top: (SIZE - STROKE) / 2,
    left: 2,
    right: 1,
    height: STROKE,
    borderRadius: STROKE,
    backgroundColor: colors.brand,
  },
  // A square with two borders, turned by 45°: the point of the arrow.
  head: {
    position: "absolute",
    top: (SIZE - HEAD) / 2,
    left: 3,
    width: HEAD,
    height: HEAD,
    borderLeftWidth: STROKE,
    borderBottomWidth: STROKE,
    borderColor: colors.brand,
    transform: [{ rotate: "45deg" }],
  },
});
