import { createPostInputSchema, DEFAULT_VOTE_OPTIONS, PostKind } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, type FieldError, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import type { LocalFile } from "../../../lib/formDataFile";
import { useCreatePost } from "../api";
import { imagesProblem } from "../images";
import { postErrorMessage } from "../texts";
import { ImagesField } from "./ImagesField";
import { InteractionFields } from "./InteractionFields";
import { PlacementFields } from "./PlacementFields";
import { SourcesField } from "./SourcesField";

const KIND_LABELS: Record<PostKind, string> = { ARTICLE: "Article", OPINION: "Opinion" };
const TEXT_FIELDS = [
  { name: "title", label: "Titre", multiline: false },
  { name: "summary", label: "Résumé", multiline: true },
  { name: "body", label: "Texte", multiline: true },
] as const;

const texts = {
  kind: "Type de publication",
  sourcesError: "Ajoutez au moins une source (lien ou référence).",
  submit: "Publier",
};

function fieldMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  return error.type === "too_big" ? "Texte trop long." : "Champ obligatoire.";
}

export function PublishForm({ onPublished }: { onPublished: (postId: string) => void }) {
  const createPost = useCreatePost();
  const [images, setImages] = useState<LocalFile[]>([]);
  const [imagesError, setImagesError] = useState<string | undefined>();
  const { control, handleSubmit, formState, setValue } = useForm({
    resolver: zodResolver(createPostInputSchema),
    defaultValues: {
      kind: "ARTICLE",
      title: "",
      summary: "",
      body: "",
      sources: [""],
      region: null,
      commentsEnabled: true,
    },
  });
  const { errors } = formState;
  const kind = useWatch({ control, name: "kind" });
  const zone = useWatch({ control, name: "zone" });

  const onSubmit = handleSubmit((post) => {
    const problem = imagesProblem(images);
    setImagesError(problem ?? undefined);
    if (!problem) {
      createPost.mutate({ post, images }, { onSuccess: (created) => onPublished(created.id) });
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <ChoiceChips
            label={texts.kind}
            options={PostKind.options}
            labels={KIND_LABELS}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              // SPEC §7: an opinion starts with the default choices; an article has none.
              setValue("voteOptions", value === "OPINION" ? [...DEFAULT_VOTE_OPTIONS] : undefined);
            }}
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
      <Controller
        control={control}
        name="sources"
        render={({ field }) => (
          <SourcesField
            sources={field.value}
            onChange={field.onChange}
            error={errors.sources ? texts.sourcesError : undefined}
          />
        )}
      />
      <PlacementFields control={control} errors={errors} zone={zone} />
      <InteractionFields control={control} errors={errors} kind={kind} />
      <ImagesField images={images} onChange={setImages} error={imagesError} />
      {createPost.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {postErrorMessage(createPost.error)}
        </Text>
      ) : null}
      <Button label={texts.submit} onPress={onSubmit} loading={createPost.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  error: { color: "#c1121f" },
});
