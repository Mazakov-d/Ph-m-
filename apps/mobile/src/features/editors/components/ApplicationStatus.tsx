import type { EditorApplicationPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { APPLICATION_STATUS_TEXTS } from "../texts";
import { colors } from "../../../components/ui/theme";

export function ApplicationStatus({ application }: { application: EditorApplicationPublic }) {
  return (
    <View style={styles.card}>
      <Text style={styles.status}>{APPLICATION_STATUS_TEXTS[application.status]}</Text>
      {application.rejectionReason ? <Text>{`Motif : ${application.rejectionReason}`}</Text> : null}
      {/* docs/DECISIONS.md (editor applications): the proof that the account is the applicant's. */}
      {application.applicantType === "SOCIAL_MEDIA" && application.status === "PENDING" ? (
        <Text style={styles.code}>
          {`Placez ce code dans la bio de votre compte jusqu'à la validation : ${application.verificationCode}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 16, borderRadius: 8, backgroundColor: colors.subtle },
  status: { fontWeight: "600" },
  code: { fontWeight: "bold", color: colors.brand },
});
