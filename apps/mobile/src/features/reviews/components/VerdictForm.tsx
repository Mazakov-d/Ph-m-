import {
  type CreateReviewInput,
  createReviewInputSchema,
  REVIEW_NOTE_MAX_LENGTH,
  Verdict,
  VERDICT_LABELS,
} from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import { SourcesField } from "../../posts/components/SourcesField";

// « faux » → « Faux » for the choice buttons.
const capitalize = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);
const CHOICE_LABELS: Record<Verdict, string> = {
  ACCURATE: capitalize(VERDICT_LABELS.ACCURATE),
  MISSING_CONTEXT: capitalize(VERDICT_LABELS.MISSING_CONTEXT),
  MISLEADING: capitalize(VERDICT_LABELS.MISLEADING),
  FALSE: capitalize(VERDICT_LABELS.FALSE),
  UNVERIFIABLE: capitalize(VERDICT_LABELS.UNVERIFIABLE),
};

const texts = {
  verdict: "Verdict",
  note: "Note publique (affichée dans « Pourquoi ? »)",
  required: "Champ obligatoire.",
  sourcesError: "Ajoutez au moins une source.",
  submit: "Rendre le verdict",
};

type Props = { onSubmit: (input: CreateReviewInput) => void; loading: boolean; error?: string };

/** SPEC §5.5: verdict, mandatory public note and at least one source. */
export function VerdictForm({ onSubmit, loading, error }: Props) {
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(createReviewInputSchema),
    defaultValues: { publicNote: "", sources: [""] },
  });
  const { errors } = formState;

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="verdict"
        render={({ field }) => (
          <ChoiceChips
            label={texts.verdict}
            options={Verdict.options}
            labels={CHOICE_LABELS}
            value={field.value}
            onChange={field.onChange}
            error={errors.verdict ? texts.required : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="publicNote"
        render={({ field }) => (
          <TextField
            label={texts.note}
            value={field.value}
            onChangeText={field.onChange}
            multiline
            maxLength={REVIEW_NOTE_MAX_LENGTH}
            error={errors.publicNote ? texts.required : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="sources"
        render={({ field }) => (
          <SourcesField
            sources={field.value}
            onChange={field.onChange}
            optional={false}
            error={errors.sources ? texts.sourcesError : undefined}
          />
        )}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button label={texts.submit} onPress={handleSubmit(onSubmit)} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  error: { color: "#c1121f" },
});
