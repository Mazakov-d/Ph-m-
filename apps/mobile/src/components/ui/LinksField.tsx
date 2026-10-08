import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "./Button";
import { colors } from "./theme";

type Props = {
  label: string;
  /** « Lien 1 », « Lien 2 »… for screen readers. */
  itemLabel: string;
  addLabel: string;
  links: string[];
  onChange: (links: string[]) => void;
  minimum: number;
  error?: string;
};

/** A list of links the user adds one by one (published works, publications…). */
export function LinksField(props: Props) {
  const { label, itemLabel, addLabel, links, onChange, minimum, error } = props;
  const update = (index: number, value: string) =>
    onChange(links.map((link, other) => (other === index ? value : link)));
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {links.map((link, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            accessibilityLabel={`${itemLabel} ${index + 1}`}
            value={link}
            onChangeText={(value) => update(index, value)}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
          />
          {links.length > minimum ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retirer : ${itemLabel} ${index + 1}`}
              onPress={() => onChange(links.filter((_, other) => other !== index))}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Button label={addLabel} variant="secondary" onPress={() => onChange([...links, ""])} />
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.surface,
  },
  remove: { fontSize: 18, color: colors.danger, paddingHorizontal: 6 },
  error: { color: colors.danger },
});
