import { DONATION_URL_MAX_LENGTH } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { colors, spacing } from "../../../components/ui/theme";
import { ApiRequestError } from "../../../lib/apiClient";
import { useUpdateDonationLink } from "../api";

const texts = {
  label: "Lien de dons (facultatif)",
  hint: "Votre page de dons (Tipeee, HelloAsso, PayPal…), en https. Les lecteurs la voient sous « Soutenir » ; Phémé ne prend aucune commission.",
  save: "Enregistrer le lien",
  remove: "Retirer le lien",
  saved: "Lien enregistré.",
  invalid: "Indiquez une adresse complète et sécurisée, qui commence par https://.",
  failed: "Une erreur est survenue. Réessayez.",
};

/** docs/DECISIONS.md (donations): the validated editor gives the link of their donation page. */
export function DonationLinkForm({ current }: { current: string | null }) {
  const update = useUpdateDonationLink();
  const [value, setValue] = useState(current ?? "");
  const error = update.error
    ? update.error instanceof ApiRequestError && update.error.code === "VALIDATION_ERROR"
      ? texts.invalid
      : texts.failed
    : undefined;

  return (
    <View style={styles.form}>
      <TextField
        label={texts.label}
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        keyboardType="url"
        maxLength={DONATION_URL_MAX_LENGTH}
        error={error}
      />
      <Text style={styles.hint}>{texts.hint}</Text>
      {update.isSuccess && !update.isPending ? (
        <Text style={styles.saved}>{texts.saved}</Text>
      ) : null}
      <Button
        label={texts.save}
        onPress={() => update.mutate(value.trim() === "" ? null : value.trim())}
        loading={update.isPending}
      />
      {current ? (
        <Button
          label={texts.remove}
          variant="secondary"
          onPress={() => {
            setValue("");
            update.mutate(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  hint: { color: colors.muted, fontSize: 13 },
  saved: { color: colors.success },
});
