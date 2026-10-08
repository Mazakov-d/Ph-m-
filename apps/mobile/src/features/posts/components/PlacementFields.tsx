import {
  type CreatePostInput,
  createPostInputSchema,
  placeToZone,
  Theme,
  zoneToPlace,
} from "@fama/shared";
import { type Control, Controller, type FieldErrors, useWatch } from "react-hook-form";
import { View } from "react-native";
import type { z } from "zod";
import { ChoiceChips } from "../../../components/ui/ChoiceChips";
import { THEME_LABELS } from "../texts";
import { PlacePicker } from "./PlacePicker";

export type PostFormValues = z.input<typeof createPostInputSchema>;

const texts = {
  place: "Zone",
  theme: "Thème",
  required: "Champ obligatoire.",
};

type Props = {
  control: Control<PostFormValues, unknown, CreatePostInput>;
  errors: FieldErrors<PostFormValues>;
  setPlace: (zone: CreatePostInput["zone"], locality: CreatePostInput["locality"]) => void;
};

/**
 * SPEC §3 + docs/DECISIONS.md (places): the place of a post, chosen in one list (International,
 * Europe, France, a region or a city), then its theme.
 */
export function PlacementFields({ control, errors, setPlace }: Props) {
  const zone = useWatch({ control, name: "zone" });
  const locality = useWatch({ control, name: "locality" });
  const place = zone ? zoneToPlace(zone, locality ?? null) : null;

  return (
    <View style={{ gap: 16 }}>
      <PlacePicker
        label={texts.place}
        value={place}
        onChange={(chosen) => {
          // A post always has a place: pressing the chosen one again keeps it.
          if (!chosen) return;
          const stored = placeToZone(chosen);
          setPlace(stored.zone, stored.locality);
        }}
        error={errors.zone || errors.locality ? texts.required : undefined}
      />
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
