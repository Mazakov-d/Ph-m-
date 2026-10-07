import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, type FieldError, useForm } from "react-hook-form";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { useApplyAsEditor } from "../api";
import { documentsProblem, type PickedDocument } from "../documents";
import { editorApplicationFormSchema } from "../formSchema";
import { editorErrorMessage } from "../texts";
import { DocumentPickerField } from "./DocumentPickerField";

const TEXT_FIELDS = [
  { name: "legalFirstName", label: "Prénom (identité légale)", multiline: false },
  { name: "legalLastName", label: "Nom (identité légale)", multiline: false },
  { name: "editorialLine", label: "Ligne éditoriale", multiline: true },
  { name: "ownerName", label: "Propriétaire du média", multiline: false },
  { name: "ownerGroup", label: "Groupe propriétaire (facultatif)", multiline: false },
] as const;

const texts = {
  intro:
    "Votre identité légale est vérifiée par l'équipe de modération et n'est jamais publiée sans votre accord.",
  showIdentity: "Afficher mon identité sur mon profil public",
  submit: "Envoyer ma demande",
};

function fieldMessage(error: FieldError | undefined): string | undefined {
  if (!error) {
    return undefined;
  }
  return error.type === "too_big" ? "Texte trop long." : "Champ obligatoire.";
}

export function EditorApplicationForm() {
  const applyAsEditor = useApplyAsEditor();
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | undefined>();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editorApplicationFormSchema),
    defaultValues: {
      legalFirstName: "",
      legalLastName: "",
      editorialLine: "",
      ownerName: "",
      ownerGroup: "",
      showIdentityPublicly: false,
    },
  });

  const onSubmit = handleSubmit((application) => {
    const problem = documentsProblem(documents);
    setDocumentsError(problem ?? undefined);
    if (!problem) {
      applyAsEditor.mutate({ application, documents });
    }
  });

  return (
    <View style={styles.form}>
      <Text>{texts.intro}</Text>
      {TEXT_FIELDS.map(({ name, label, multiline }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextField
              label={label}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline={multiline}
              error={fieldMessage(errors[name])}
            />
          )}
        />
      ))}
      <Controller
        control={control}
        name="showIdentityPublicly"
        render={({ field }) => (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{texts.showIdentity}</Text>
            <Switch
              accessibilityLabel={texts.showIdentity}
              value={field.value}
              onValueChange={field.onChange}
            />
          </View>
        )}
      />
      <DocumentPickerField documents={documents} onChange={setDocuments} error={documentsError} />
      {applyAsEditor.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {editorErrorMessage(applyAsEditor.error)}
        </Text>
      ) : null}
      <Button label={texts.submit} onPress={onSubmit} loading={applyAsEditor.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { flex: 1, fontWeight: "600" },
  error: { color: "#c1121f" },
});
