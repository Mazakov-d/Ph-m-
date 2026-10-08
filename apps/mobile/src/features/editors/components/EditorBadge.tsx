import type { EditorStatus } from "@fama/shared";
import { StyleSheet, Text } from "react-native";
import { EDITOR_BADGES } from "../texts";
import { colors } from "../../../components/ui/theme";

export function EditorBadge({ status }: { status: EditorStatus }) {
  const label = EDITOR_BADGES[status];
  if (!label) {
    return null;
  }
  return (
    <Text style={[styles.badge, status === "CERTIFIED" ? styles.certified : styles.independent]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: "600",
    overflow: "hidden",
  },
  certified: { backgroundColor: colors.brand, color: colors.onBrand },
  independent: { backgroundColor: colors.subtle, color: colors.brand },
});
