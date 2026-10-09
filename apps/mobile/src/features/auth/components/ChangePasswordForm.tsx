import { PASSWORD_MIN_LENGTH, updatePasswordInputSchema } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, type FieldError, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { colors } from "../../../components/ui/theme";
import { ApiRequestError, apiClient } from "../../../lib/apiClient";
import { authApi } from "../api";
import { apiErrorMessage } from "../errorMessages";

const texts = {
  current: "Mot de passe actuel",
  next: `Nouveau mot de passe (${PASSWORD_MIN_LENGTH} caractères au moins)`,
  confirmation: "Nouveau mot de passe, encore une fois",
  submit: "Changer le mot de passe",
  done: "Mot de passe changé. Vos autres appareils sont déconnectés.",
  errors: {
    currentPassword: "Indiquez votre mot de passe actuel.",
    newPassword: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
    confirmation: "Les deux mots de passe ne correspondent pas.",
    wrongPassword: "Mot de passe actuel incorrect.",
  },
};

// The confirmation only guards against a typo: it stays in the form, the API never sees it.
const formSchema = updatePasswordInputSchema
  .extend({ confirmation: z.string() })
  .refine((form) => form.confirmation === form.newPassword, { path: ["confirmation"] });
type FormValues = z.infer<typeof formSchema>;

const FIELDS = [
  { name: "currentPassword", label: texts.current, autoComplete: "current-password" },
  { name: "newPassword", label: texts.next, autoComplete: "new-password" },
  { name: "confirmation", label: texts.confirmation, autoComplete: "new-password" },
] as const;

/** The French message of a field: the API's (wrong password) or the one of the field's rule. */
function fieldError(name: keyof typeof texts.errors, error: FieldError | undefined) {
  if (!error) return undefined;
  return error.type === "server" && error.message ? error.message : texts.errors[name];
}

/** docs/DECISIONS.md (password change): from the dashboard, for every account. */
export function ChangePasswordForm() {
  const change = useMutation({
    mutationFn: authApi.updatePassword,
    // The API signed out every device: this one goes on with the new session.
    onSuccess: (session) => apiClient.startSession(session),
  });
  const { control, handleSubmit, formState, reset, setError } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmation: "" },
  });
  const submit = handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => reset(),
        onError: (error) => {
          if (error instanceof ApiRequestError && error.code === "INVALID_CREDENTIALS") {
            setError("currentPassword", {
              type: "server",
              message: texts.errors.wrongPassword,
            });
          } else {
            setError("root", { message: apiErrorMessage(error).message });
          }
        },
      },
    ),
  );

  return (
    <View style={styles.form}>
      {FIELDS.map(({ name, label, autoComplete }) => (
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
              secureTextEntry
              autoComplete={autoComplete}
              onSubmitEditing={name === "confirmation" ? () => void submit() : undefined}
              error={fieldError(name, formState.errors[name])}
            />
          )}
        />
      ))}
      {formState.errors.root ? (
        <Text style={styles.error}>{formState.errors.root.message}</Text>
      ) : null}
      {change.isSuccess ? <Text style={styles.done}>{texts.done}</Text> : null}
      <Button label={texts.submit} onPress={submit} loading={change.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  error: { color: colors.danger },
  done: { color: colors.success },
});
