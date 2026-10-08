import { type CreatePostInput, DEFAULT_TYPEFACES, PostLayout } from "@fama/shared";
import { type Control, Controller, type FieldError, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { spacing, textSizes } from "../../../components/ui/theme";
import { FormattedTextField } from "./FormattedTextField";
import type { PostFormValues } from "./PlacementFields";

const TEXT_FIELDS = [
  { name: "title", label: "Titre", multiline: false, size: textSizes.postTitle, height: 140 },
  { name: "summary", label: "Résumé", multiline: true, size: textSizes.summary, height: 170 },
  { name: "body", label: "Texte", multiline: true, size: textSizes.body, height: 340 },
] as const;

const LAYOUT_LABELS: Record<PostLayout, string> = {
  TEXT_FIRST: "Titre, résumé, texte, photos",
  MEDIA_FIRST: "Titre, résumé, photos, texte",
};

const texts = { layout: "Ordre de la publication" };

function fieldMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  return error.type === "too_big" ? "Texte trop long." : "Champ obligatoire.";
}

type Props = {
  control: Control<PostFormValues, unknown, CreatePostInput>;
  errors: FieldErrors<PostFormValues>;
};

/**
 * Interface brief: the three text blocks with their typeface, bold and italic, and the order of
 * the blocks (the feed shows the first three).
 */
export function PostTextFields({ control, errors }: Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      {TEXT_FIELDS.map(({ name, label, multiline, size, height }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <Controller
              control={control}
              name={`typefaces.${name}`}
              render={({ field: typefaceField }) => (
                <FormattedTextField
                  label={label}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  typeface={typefaceField.value ?? DEFAULT_TYPEFACES[name]}
                  onTypefaceChange={typefaceField.onChange}
                  size={size}
                  multiline={multiline}
                  height={height}
                  error={fieldMessage(errors[name])}
                />
              )}
            />
          )}
        />
      ))}
      <Controller
        control={control}
        name="layout"
        render={({ field }) => (
          <ChoiceChips
            label={texts.layout}
            options={PostLayout.options}
            labels={LAYOUT_LABELS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </View>
  );
}
