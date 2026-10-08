import { JURY_NOTE_MAX_LENGTH, SOURCE_MAX_LENGTH, Verdict, VERDICT_LABELS } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import { colors, spacing } from "../../../components/ui/theme";
import { useJuryVote } from "../api";
import { juryErrorMessage } from "../texts";

const texts = {
  verdict: "Votre verdict",
  source: "Source qui l'appuie (lien ou référence, obligatoire)",
  note: "Remarque (facultatif)",
  send: "Envoyer mon vote",
};

/** SPEC §5.8: a juror's vote — a verdict with a mandatory source, once. */
export function JuryVoteForm({ seatId }: { seatId: string }) {
  const vote = useJuryVote(seatId);
  const [verdict, setVerdict] = useState<Verdict | undefined>();
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!verdict) return;
    vote.mutate({ verdict, source: source.trim(), note: note.trim() === "" ? null : note.trim() });
  };

  return (
    <View style={styles.form}>
      <ChoiceChips
        label={texts.verdict}
        options={Verdict.options}
        labels={VERDICT_LABELS}
        value={verdict}
        onChange={setVerdict}
      />
      <TextField
        label={texts.source}
        value={source}
        onChangeText={setSource}
        maxLength={SOURCE_MAX_LENGTH}
      />
      <TextField
        label={texts.note}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={JURY_NOTE_MAX_LENGTH}
      />
      {vote.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {juryErrorMessage(vote.error)}
        </Text>
      ) : null}
      <Button label={texts.send} onPress={submit} loading={vote.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  error: { color: colors.danger },
});
