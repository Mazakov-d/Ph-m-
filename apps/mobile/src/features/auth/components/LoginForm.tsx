import { loginInputSchema } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { useAuth } from "../../../providers/AuthProvider";
import { apiErrorMessage, fieldErrorMessage } from "../errorMessages";
import { colors } from "../../../components/ui/theme";

const texts = {
  // docs/DECISIONS.md (login): the e-mail address or the pseudo.
  identifier: "E-mail ou pseudo",
  password: "Mot de passe",
  submit: "Se connecter",
};

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { signIn } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await signIn(input);
      onSuccess();
    } catch (error) {
      const { message } = apiErrorMessage(error);
      setError("root", { type: "server", message });
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="identifier"
        render={({ field }) => (
          <TextField
            label={texts.identifier}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            error={fieldErrorMessage("identifier", errors.identifier)}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={texts.password}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="current-password"
            // docs/DECISIONS.md: Enter after the password signs in.
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
            error={fieldErrorMessage("password", errors.password)}
          />
        )}
      />
      {errors.root ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {errors.root.message}
        </Text>
      ) : null}
      <Button label={texts.submit} onPress={onSubmit} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  formError: { color: colors.danger },
});
