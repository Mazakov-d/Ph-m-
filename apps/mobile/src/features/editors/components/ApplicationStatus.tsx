import type { EditorApplicationPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { APPLICATION_STATUS_TEXTS } from "../texts";

export function ApplicationStatus({ application }: { application: EditorApplicationPublic }) {
  return (
    <View style={styles.card}>
      <Text style={styles.status}>{APPLICATION_STATUS_TEXTS[application.status]}</Text>
      {application.rejectionReason ? <Text>{`Motif : ${application.rejectionReason}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 16, borderRadius: 8, backgroundColor: "#e9ecef" },
  status: { fontWeight: "600" },
});
