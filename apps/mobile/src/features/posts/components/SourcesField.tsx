import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";

const texts = {
  label: "Sources (lien ou référence, au moins une)",
  placeholder: "https://… ou « Rapport de la Cour des comptes, 2026 »",
  add: "Ajouter une source",
  remove: (index: number) => `Retirer la source ${index + 1}`,
};

type Props = { sources: string[]; onChange: (sources: string[]) => void; error?: string };

/** SPEC §3: at least one source per post. */
export function SourcesField({ sources, onChange, error }: Props) {
  const update = (index: number, value: string) =>
    onChange(sources.map((source, other) => (other === index ? value : source)));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{texts.label}</Text>
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
          {sources.length > 1 ? (
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
