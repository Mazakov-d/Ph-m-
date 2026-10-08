import {
  type CreateModeratorInput,
  createModeratorInputSchema,
  PASSWORD_MIN_LENGTH,
} from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { colors, spacing } from "../../../components/ui/theme";
import { ApiRequestError } from "../../../lib/apiClient";
import { useCreateModerator } from "../api";

const FIELDS = [
  { name: "pseudo", label: "Pseudo", secure: false, keyboard: "default" },
  { name: "email", label: "Adresse e-mail", secure: false, keyboard: "email-address" },
  {
    name: "password",
    label: `Mot de passe (${PASSWORD_MIN_LENGTH} caractères au moins)`,
    secure: true,
    keyboard: "default",
  },
] as const;

const texts = {
  create: "Créer le compte modérateur",
  invalid: "Champ obligatoire ou invalide.",
  created: (pseudo: string) => `Le compte modérateur ${pseudo} est créé.`,
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === "EMAIL_TAKEN") {
    return "Cette adresse e-mail a déjà un compte.";
  }
  if (error instanceof ApiRequestError && error.code === "PSEUDO_TAKEN") {
    return "Ce pseudo est déjà pris.";
  }
  return "Une erreur est survenue. Réessayez.";
}

/** docs/DECISIONS.md (moderators): « + Modérateur » — a new account with the moderation rights. */
export function AddModeratorForm({ onDone }: { onDone: () => void }) {
  const create = useCreateModerator();
  const { control, handleSubmit, formState, reset } = useForm<CreateModeratorInput>({
    resolver: zodResolver(createModeratorInputSchema),
    defaultValues: { pseudo: "", email: "", password: "" },
  });
  const submit = handleSubmit((input) =>
    create.mutate(input, {
      onSuccess: () => {
        reset();
        onDone();
      },
    }),
  );
  return (
    <View style={styles.form}>
      {FIELDS.map(({ name, label, secure, keyboard }) => (
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
              autoCapitalize="none"
              keyboardType={keyboard}
              secureTextEntry={secure}
              error={formState.errors[name] ? texts.invalid : undefined}
            />
          )}
        />
      ))}
      {create.error ? <Text style={styles.error}>{errorMessage(create.error)}</Text> : null}
      <Button label={texts.create} onPress={submit} loading={create.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  error: { color: colors.danger },
});
