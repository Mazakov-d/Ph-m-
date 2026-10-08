import {
  type CreateEditorApplicationInput,
  EDITOR_WORK_LINKS_MIN,
  type EditorApplicantType,
} from "@fama/shared";
import { type Control, Controller, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { LinksField } from "../../../components/ui/LinksField";
import { TextField } from "../../../components/ui/TextField";
import type { EditorApplicationFormValues } from "../formSchema";

type TextName =
  | "siret"
  | "websiteUrl"
  | "publicationDirector"
  | "professionalEmail"
  | "cppapNumber"
  | "pressCardNumber"
  | "socialAccountUrl";

const LABELS: Record<TextName, string> = {
  siret: "SIRET (14 chiffres)",
  websiteUrl: "Site du média (https://…)",
  publicationDirector: "Directeur de publication",
  professionalEmail: "Votre e-mail professionnel (sur le domaine du site)",
  cppapNumber: "Numéro d'agrément CPPAP (facultatif)",
  pressCardNumber: "Numéro de carte de presse (facultatif)",
  socialAccountUrl: "Lien vers le compte (https://…)",
};

// docs/DECISIONS.md (editor applications): the fields each kind of applicant fills in.
const FIELDS: Record<EditorApplicantType, { texts: TextName[]; works: string | null }> = {
  MEDIA_GROUP: {
    texts: ["siret", "websiteUrl", "publicationDirector", "professionalEmail", "cppapNumber"],
    works: null,
  },
  JOURNALIST: { texts: ["pressCardNumber"], works: "Vos travaux publiés et signés (3 au moins)" },
  INDEPENDENT: {
    texts: ["pressCardNumber", "siret"],
    works: "Vos travaux publiés (3 au moins)",
  },
  SOCIAL_MEDIA: { texts: ["socialAccountUrl"], works: "Liens vers des publications (3 au moins)" },
};

const OPTIONAL_FOR: Partial<Record<EditorApplicantType, TextName[]>> = {
  INDEPENDENT: ["siret"],
};

const texts = { invalid: "Champ obligatoire ou invalide.", work: "Lien", add: "Ajouter un lien" };

type Props = {
  type: EditorApplicantType;
  control: Control<EditorApplicationFormValues, unknown, CreateEditorApplicationInput>;
  errors: FieldErrors<EditorApplicationFormValues>;
};

/** The fields of the chosen kind of applicant (docs/DECISIONS.md: editor applications). */
export function ApplicantFields({ type, control, errors }: Props) {
  const fields = FIELDS[type];
  return (
    <View style={{ gap: 16 }}>
      {fields.texts.map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextField
              label={
                OPTIONAL_FOR[type]?.includes(name) ? `${LABELS[name]} (facultatif)` : LABELS[name]
              }
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              error={errors[name] ? texts.invalid : undefined}
            />
          )}
        />
      ))}
      {fields.works ? (
        <Controller
          control={control}
          name="workLinks"
          render={({ field }) => (
            <LinksField
              label={fields.works ?? ""}
              itemLabel={texts.work}
              addLabel={texts.add}
              links={field.value}
              onChange={field.onChange}
              minimum={EDITOR_WORK_LINKS_MIN}
              error={errors.workLinks ? texts.invalid : undefined}
            />
          )}
        />
      ) : null}
    </View>
  );
}
