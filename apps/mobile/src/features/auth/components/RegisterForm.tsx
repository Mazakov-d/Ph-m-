import { registerInputSchema } from "@fama/shared";
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
  pseudo: "Pseudo (affiché sur vos commentaires)",
  submit: "Créer mon compte",
};

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { signUp } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { email: "", password: "", pseudo: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await signUp(input);
      onSuccess();
    } catch (error) {
      const { field, message } = apiErrorMessage(error);
      setError(field ?? "root", { type: "server", message });
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
        name="pseudo"
        render={({ field }) => (
          <TextField
            label={texts.pseudo}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="username"
            error={fieldErrorMessage("pseudo", errors.pseudo)}
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
            autoComplete="new-password"
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
