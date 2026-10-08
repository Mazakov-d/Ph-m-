import { CommentReportReason, REPORT_DETAILS_MAX_LENGTH } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import {
  COMMENT_REPORT_REASON_LABELS as REASON_LABELS,
  reportErrorMessage,
} from "../../reports/texts";
import { useReportComment } from "../api";

const texts = {
  reason: "Pourquoi signalez-vous ce commentaire ?",
  details: "Précisez (obligatoire pour « Autre »)",
  detailsRequired: "Expliquez le problème en quelques mots.",
  send: "Envoyer le signalement",
  cancel: "Annuler",
};

type Props = { commentId: string; postId: string; onClose: () => void };

export function CommentReportPanel({ commentId, postId, onClose }: Props) {
  const report = useReportComment(postId);
  const [reason, setReason] = useState<CommentReportReason | undefined>();
  const [details, setDetails] = useState("");
  const [missingDetails, setMissingDetails] = useState(false);

  const send = () => {
    if (!reason) return;
    const trimmed = details.trim();
    const missing = reason === "OTHER" && trimmed === "";
    setMissingDetails(missing);
    if (!missing) {
      report.mutate(
        { commentId, input: { reason, details: trimmed || null } },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <View style={styles.panel}>
      <ChoiceChips
        label={texts.reason}
        options={CommentReportReason.options}
        labels={REASON_LABELS}
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
          error={missingDetails ? texts.detailsRequired : undefined}
        />
      ) : null}
      {report.error ? <Text style={styles.error}>{reportErrorMessage(report.error)}</Text> : null}
      {reason ? <Button label={texts.send} onPress={send} loading={report.isPending} /> : null}
      <Button label={texts.cancel} variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, padding: 8, borderRadius: 6, backgroundColor: "#f8f9fa" },
  error: { color: "#c1121f" },
});
