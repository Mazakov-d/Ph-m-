import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";

const texts = {
  label: "Sources (lien ou référence, au moins une)",
  optionalLabel: "Sources (lien ou référence, facultatives pour une opinion)",
  placeholder: "https://… ou « Rapport de la Cour des comptes, 2026 »",
  add: "Ajouter une source",
  remove: (index: number) => `Retirer la source ${index + 1}`,
};

type Props = {
  sources: string[];
  onChange: (sources: string[]) => void;
  optional: boolean;
  error?: string;
};

/** SPEC §3: at least one source for an article, optional for an opinion. */
export function SourcesField({ sources, onChange, optional, error }: Props) {
  const minimum = optional ? 0 : 1;
  const update = (index: number, value: string) =>
    onChange(sources.map((source, other) => (other === index ? value : source)));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{optional ? texts.optionalLabel : texts.label}</Text>
      {sources.map((source, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            accessibilityLabel={`Source ${index + 1}`}
            value={source}
            onChangeText={(value) => update(index, value)}
            placeholder={texts.placeholder}
            autoCapitalize="none"
            style={styles.input}
          />
          {sources.length > minimum ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.remove(index)}
              onPress={() => onChange(sources.filter((_, other) => other !== index))}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Button label={texts.add} variant="secondary" onPress={() => onChange([...sources, ""])} />
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
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  remove: { fontSize: 18, paddingHorizontal: 8 },
  error: { color: "#c1121f" },
});
