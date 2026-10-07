import { type CreatePostInput, createPostInputSchema, Theme, Zone } from "@fama/shared";
import { type Control, Controller, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import type { z } from "zod";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { TextField } from "../../../components/ui/TextField";
import { THEME_LABELS, ZONE_LABELS } from "../texts";

export type PostFormValues = z.input<typeof createPostInputSchema>;

const texts = {
  zone: "Zone",
  region: "Région",
  regionError: "Indiquez la région pour une publication locale.",
  theme: "Thème",
  required: "Champ obligatoire.",
};

type Props = {
  control: Control<PostFormValues, unknown, CreatePostInput>;
  errors: FieldErrors<PostFormValues>;
  zone: Zone | undefined;
};

/** SPEC §3: zone (with a region when LOCAL) and theme of a post. */
export function PlacementFields({ control, errors, zone }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <Controller
        control={control}
        name="zone"
        render={({ field }) => (
          <ChoiceChips
            label={texts.zone}
            options={Zone.options}
            labels={ZONE_LABELS}
            value={field.value}
            onChange={field.onChange}
            error={errors.zone ? texts.required : undefined}
          />
        )}
      />
      {zone === "LOCAL" ? (
        <Controller
          control={control}
          name="region"
          render={({ field }) => (
            // The API expects null outside the LOCAL zone, and a non-empty region inside it.
            <TextField
              label={texts.region}
              value={field.value ?? ""}
              onChangeText={(text) => field.onChange(text || null)}
              error={errors.region ? texts.regionError : undefined}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="theme"
        render={({ field }) => (
          <ChoiceChips
            label={texts.theme}
            options={Theme.options}
            labels={THEME_LABELS}
            value={field.value}
            onChange={field.onChange}
            error={errors.theme ? texts.required : undefined}
          />
        )}
      />
    </View>
  );
}
