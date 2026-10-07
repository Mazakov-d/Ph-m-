import { loginInputSchema } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { useAuth } from "../../../providers/AuthProvider";
import { apiErrorMessage, fieldErrorMessage } from "../errorMessages";

const texts = {
  email: "Adresse e-mail",
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
    defaultValues: { email: "", password: "" },
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
        name="email"
        render={({ field }) => (
          <TextField
            label={texts.email}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={fieldErrorMessage("email", errors.email)}
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
  formError: { color: "#c1121f" },
});
