import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { TextField } from "./TextField";

type Props = {
  label: string;
  submitLabel: string;
  maxLength: number;
  loading: boolean;
  error?: string;
  onSubmit: (text: string, done: () => void) => void;
};

/** A button that opens a short text form (reply, correction, appeal…). */
export function TextActionForm({ label, submitLabel, maxLength, loading, error, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return <Button label={label} variant="secondary" onPress={() => setOpen(true)} />;
  }
  return (
    <View style={styles.form}>
      <TextField
        label={label}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={maxLength}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        label={submitLabel}
        loading={loading}
        onPress={() => {
          if (text.trim()) {
            onSubmit(text.trim(), () => {
              setText("");
              setOpen(false);
            });
          }
        }}
      />
      <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  error: { color: "#c1121f" },
});
