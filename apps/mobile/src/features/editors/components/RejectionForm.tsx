import { REJECTION_REASON_MAX_LENGTH } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";

const texts = {
  reason: "Motif du refus (communiqué au demandeur)",
  required: "Le motif est obligatoire.",
  confirm: "Confirmer le refus",
  cancel: "Annuler",
};

type Props = { onConfirm: (reason: string) => void; onCancel: () => void; loading: boolean };

/** SPEC §2.2: a rejection always carries a reason. */
export function RejectionForm({ onConfirm, onCancel, loading }: Props) {
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  const confirm = () => {
    const trimmed = reason.trim();
    setShowError(trimmed.length === 0);
    if (trimmed.length > 0) {
      onConfirm(trimmed);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label={texts.reason}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={REJECTION_REASON_MAX_LENGTH}
        error={showError ? texts.required : undefined}
      />
      <Button label={texts.confirm} onPress={confirm} loading={loading} />
      <Button label={texts.cancel} variant="secondary" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 8 } });
