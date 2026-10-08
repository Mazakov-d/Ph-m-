import { type CreatePostInput, PostLayout } from "@fama/shared";
import { type Control, Controller } from "react-hook-form";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import type { PostFormValues } from "./PlacementFields";

const LAYOUT_LABELS: Record<PostLayout, string> = {
  TEXT_FIRST: "Titre, résumé, texte, photos",
  MEDIA_FIRST: "Titre, résumé, photos, texte",
};

const texts = { layout: "Ordre de la publication" };

type Props = { control: Control<PostFormValues, unknown, CreatePostInput> };

/** Interface brief: the order of the blocks (the feed shows the first three), last in the form. */
export function LayoutField({ control }: Props) {
  return (
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
  );
}
