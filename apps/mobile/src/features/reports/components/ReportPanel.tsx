import { PostReportReason, REPORT_DETAILS_MAX_LENGTH } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import { useReportPost } from "../api";
import { POST_REPORT_REASON_LABELS, reportErrorMessage } from "../texts";

const texts = {
  reason: "Pourquoi signalez-vous cette publication ?",
  details: "Précisez (obligatoire pour « Autre »)",
  detailsRequired: "Expliquez le problème en quelques mots.",
  send: "Envoyer le signalement",
  cancel: "Annuler",
};

type Props = { postId: string; onClose: () => void };

/** SPEC §5.1: a mandatory reason, plus free text when the reason is « Autre ». */
export function ReportPanel({ postId, onClose }: Props) {
  const reportPost = useReportPost(postId);
  const [reason, setReason] = useState<PostReportReason | undefined>();
  const [details, setDetails] = useState("");
  const [showDetailsError, setShowDetailsError] = useState(false);

  const send = () => {
    if (!reason) return;
    const trimmed = details.trim();
    const missingDetails = reason === "OTHER" && trimmed === "";
    setShowDetailsError(missingDetails);
    if (!missingDetails) {
      reportPost.mutate({ reason, details: trimmed || null }, { onSuccess: onClose });
    }
  };

  return (
    <View style={styles.panel}>
      <ChoiceChips
        label={texts.reason}
        options={PostReportReason.options}
        labels={POST_REPORT_REASON_LABELS}
        value={reason}
        onChange={setReason}
      />
      {reason ? (
        <TextField
          label={texts.details}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          error={showDetailsError ? texts.detailsRequired : undefined}
        />
      ) : null}
      {reportPost.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {reportErrorMessage(reportPost.error)}
        </Text>
      ) : null}
      {reason ? <Button label={texts.send} onPress={send} loading={reportPost.isPending} /> : null}
      <Button label={texts.cancel} variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, padding: 12, borderRadius: 8, backgroundColor: "#fff" },
  error: { color: "#c1121f" },
});
