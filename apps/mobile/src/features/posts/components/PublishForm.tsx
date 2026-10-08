import {
  createPostInputSchema,
  DEFAULT_POST_LAYOUT,
  DEFAULT_TYPEFACES,
  DEFAULT_VOTE_OPTIONS,
  PostKind,
} from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { colors, spacing } from "../../../components/ui/theme";
import type { LocalFile } from "../../../lib/formDataFile";
import { useCreatePost } from "../api";
import { imagesProblem, type LocalVideo, videoProblem } from "../images";
import { postErrorMessage } from "../texts";
import { ImagesField } from "./ImagesField";
import { InteractionFields } from "./InteractionFields";
import { LayoutField } from "./LayoutField";
import { PlacementFields } from "./PlacementFields";
import { PostTextFields } from "./PostTextFields";
import { SourcesField } from "./SourcesField";
import { VideoField } from "./VideoField";

const KIND_LABELS: Record<PostKind, string> = { ARTICLE: "Article", OPINION: "Opinion" };

const texts = {
  kind: "Type de publication",
  sourcesError: "Ajoutez au moins une source (lien ou référence).",
  submit: "Publier",
};

export function PublishForm({ onPublished }: { onPublished: (postId: string) => void }) {
  const createPost = useCreatePost();
  const [images, setImages] = useState<LocalFile[]>([]);
  const [imagesError, setImagesError] = useState<string | undefined>();
  const [video, setVideo] = useState<LocalVideo | null>(null);
  const [videoError, setVideoError] = useState<string | undefined>();
  const { control, handleSubmit, formState, setValue, getValues } = useForm({
    resolver: zodResolver(createPostInputSchema),
    defaultValues: {
      kind: "ARTICLE",
      title: "",
      summary: "",
      body: "",
      sources: [""],
      region: null,
      commentsEnabled: true,
      layout: DEFAULT_POST_LAYOUT,
      typefaces: { ...DEFAULT_TYPEFACES },
    },
  });
  const { errors } = formState;
  const kind = useWatch({ control, name: "kind" });
  const zone = useWatch({ control, name: "zone" });

  const onSubmit = handleSubmit((post) => {
    const problem = imagesProblem(images);
    const videoIssue = videoProblem(video);
    setImagesError(problem ?? undefined);
    setVideoError(videoIssue ?? undefined);
    if (!problem && !videoIssue) {
      createPost.mutate(
        { post, images, video: video?.file ?? null },
        { onSuccess: (created) => onPublished(created.id) },
      );
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
              // SPEC §3: sources are optional for an opinion; an article needs at least one.
              const sources = getValues("sources");
              if (value === "OPINION" && sources.every((source) => source.trim() === "")) {
                setValue("sources", []);
              }
              if (value === "ARTICLE" && sources.length === 0) {
                setValue("sources", [""]);
              }
            }}
          />
        )}
      />
      {/* Interface brief: title, summary, article, pictures, sources, zone, theme… order last. */}
      <PostTextFields control={control} errors={errors} />
      <ImagesField images={images} onChange={setImages} error={imagesError} />
      <VideoField video={video} onChange={setVideo} error={videoError} />
      <Controller
        control={control}
        name="sources"
        render={({ field }) => (
          <SourcesField
            sources={field.value}
            onChange={field.onChange}
            optional={kind === "OPINION"}
            error={errors.sources ? texts.sourcesError : undefined}
          />
        )}
      />
      <PlacementFields control={control} errors={errors} zone={zone} />
      <InteractionFields control={control} errors={errors} kind={kind} />
      <LayoutField control={control} />
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
  form: { gap: spacing.lg },
  error: { color: colors.danger },
});
