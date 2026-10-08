import type { CreatePostInput, PostKind } from "@fama/shared";
import { type Control, Controller, type FieldErrors } from "react-hook-form";
import { StyleSheet, Switch, Text, View } from "react-native";
import type { PostFormValues } from "./PlacementFields";
import { VoteOptionsField } from "./VoteOptionsField";

const texts = {
  comments: "Autoriser les commentaires",
  optionsError: "Chaque choix doit être rempli (50 caractères maximum) et différent des autres.",
};

type Props = {
  control: Control<PostFormValues, unknown, CreatePostInput>;
  errors: FieldErrors<PostFormValues>;
  kind: PostKind;
};

/**
 * SPEC §3 and §7: an article lets the editor turn comments off; an opinion always has comments
 * and offers answer choices to vote on.
 */
export function InteractionFields({ control, errors, kind }: Props) {
  if (kind === "OPINION") {
    return (
      <Controller
        control={control}
        name="voteOptions"
        render={({ field }) => (
          <VoteOptionsField
            options={field.value ?? []}
            onChange={field.onChange}
            error={errors.voteOptions ? texts.optionsError : undefined}
          />
        )}
      />
    );
  }
  return (
    <Controller
      control={control}
      name="commentsEnabled"
      render={({ field }) => (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{texts.comments}</Text>
          <Switch
            accessibilityLabel={texts.comments}
            value={field.value ?? true}
            onValueChange={field.onChange}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { flex: 1, fontWeight: "600" },
});
