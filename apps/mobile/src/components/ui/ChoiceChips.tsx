import { StyleSheet, Text, View } from "react-native";
import { Chip } from "./Chip";
import { colors } from "./theme";

type ChoiceChipsProps<Value extends string> = {
  label: string;
  options: readonly Value[];
  labels: Record<Value, string>;
  value: Value | undefined;
  onChange: (value: Value) => void;
  error?: string;
};

/** A single choice among a few options (kind, zone, theme…); nothing is chosen by default. */
export function ChoiceChips<Value extends string>(props: ChoiceChipsProps<Value>) {
  const { label, options, labels, value, onChange, error } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option}
            label={labels[option]}
            selected={option === value}
            onPress={() => onChange(option)}
          />
        ))}
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
  field: { gap: 8 },
  label: { fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: colors.danger },
});
