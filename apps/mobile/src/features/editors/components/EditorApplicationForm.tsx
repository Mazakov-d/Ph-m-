import type { CreateEditorApplicationInput, EditorApplicantType } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, type FieldError, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { colors } from "../../../components/ui/theme";
import { useApplyAsEditor } from "../api";
import { documentsProblem, type PickedDocument } from "../documents";
import { type EditorApplicationFormValues, editorApplicationFormSchema } from "../formSchema";
import { editorErrorMessage } from "../texts";
import { ApplicantFields } from "./ApplicantFields";
import { ApplicantTypePicker } from "./ApplicantTypePicker";
import { DocumentPickerField } from "./DocumentPickerField";

const TEXT_FIELDS = [
  { name: "legalFirstName", label: "Prénom (identité légale)", multiline: false },
  { name: "legalLastName", label: "Nom (identité légale)", multiline: false },
  { name: "editorialLine", label: "Ligne éditoriale", multiline: true },
  { name: "ownerName", label: "Propriétaire du média", multiline: false },
  { name: "ownerGroup", label: "Groupe propriétaire (facultatif)", multiline: false },
] as const;

// docs/DECISIONS.md (editor applications): the files to upload for each kind of applicant.
const DOCUMENTS: Record<EditorApplicantType, string> = {
  MEDIA_GROUP: "Votre pièce d'identité, le Kbis du média et l'attestation signée qui vous désigne.",
  JOURNALIST: "Votre pièce d'identité (et votre carte de presse si vous en avez une).",
  INDEPENDENT: "Votre pièce d'identité (et votre carte de presse si vous en avez une).",
  SOCIAL_MEDIA: "Votre pièce d'identité.",
};

const texts = {
  intro:
    "Toute personne crédible qui partage de l'information peut devenir éditeur. Votre demande est vérifiée par l'équipe de modération ; votre identité n'est jamais publiée sans votre accord.",
  chooseType: "Choisissez votre profil.",
  showIdentity: "Afficher mon identité sur mon profil public",
  submit: "Envoyer ma demande",
  question: "Une question sur votre demande ? Contacter Phémé",
};

function fieldMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  return error.type === "too_big" ? "Texte trop long." : "Champ obligatoire.";
}

export function EditorApplicationForm() {
  const applyAsEditor = useApplyAsEditor();
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | undefined>();
  const { control, handleSubmit, formState } = useForm<
    EditorApplicationFormValues,
    unknown,
    CreateEditorApplicationInput
  >({
    resolver: zodResolver(editorApplicationFormSchema),
    defaultValues: {
      legalFirstName: "",
      legalLastName: "",
      editorialLine: "",
      ownerName: "",
      ownerGroup: "",
      showIdentityPublicly: false,
      siret: "",
      websiteUrl: "",
      publicationDirector: "",
      professionalEmail: "",
      cppapNumber: "",
      workLinks: ["", "", ""],
      pressCardNumber: "",
      socialAccountUrl: "",
    },
  });
  const { errors } = formState;
  const type = useWatch({ control, name: "applicantType" });

  const onSubmit = handleSubmit((application) => {
    const problem = documentsProblem(documents);
    setDocumentsError(problem ?? undefined);
    if (!problem) applyAsEditor.mutate({ application, documents });
  });

  return (
    <View style={styles.form}>
      <Text>{texts.intro}</Text>
      <Controller
        control={control}
        name="applicantType"
        render={({ field }) => (
          <ApplicantTypePicker
            value={field.value}
            onChange={field.onChange}
            error={errors.applicantType ? texts.chooseType : undefined}
          />
        )}
      />
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
      {type ? <ApplicantFields type={type} control={control} errors={errors} /> : null}
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
      <DocumentPickerField
        what={type ? DOCUMENTS[type] : DOCUMENTS.INDEPENDENT}
        documents={documents}
        onChange={setDocuments}
        error={documentsError}
      />
      {applyAsEditor.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {editorErrorMessage(applyAsEditor.error)}
        </Text>
      ) : null}
      <Button label={texts.submit} onPress={onSubmit} loading={applyAsEditor.isPending} />
      <Link href="/support?topic=EDITOR_ACCOUNT" style={styles.link}>
        {texts.question}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { flex: 1, fontWeight: "600" },
  error: { color: colors.danger },
  link: { color: colors.brand, fontWeight: "600", textAlign: "center" },
});
