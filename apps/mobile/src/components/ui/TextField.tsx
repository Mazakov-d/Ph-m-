import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, radius, spacing } from "./theme";

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
};

const texts = { show: "Afficher", hide: "Masquer" };

/**
 * A labelled text field. A password field (`secureTextEntry`) gets a button that shows what is
 * being typed (interface brief).
 */
export function TextField({ label, error, secureTextEntry, ...inputProps }: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          secureTextEntry={secureTextEntry === true && !revealed}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `${texts.hide} : ${label}` : `${texts.show} : ${label}`}
            onPress={() => setRevealed((current) => !current)}
            style={styles.reveal}
          >
            <Text style={styles.revealLabel}>{revealed ? texts.hide : texts.show}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { fontWeight: "600" },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, padding: 10, fontSize: 16 },
  reveal: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  revealLabel: { color: colors.brand, fontWeight: "600" },
  error: { color: colors.danger },
});
