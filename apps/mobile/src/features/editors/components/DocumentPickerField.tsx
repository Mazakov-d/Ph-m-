import { EDITOR_DOCUMENT_TYPES, EDITOR_DOCUMENTS_MAX_COUNT } from "@fama/shared";
import { getDocumentAsync } from "expo-document-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { type PickedDocument, toPickedDocument } from "../documents";
import { colors } from "../../../components/ui/theme";

const texts = {
  label: "Justificatifs",
  hint: `PDF, JPEG ou PNG, 10 Mo maximum chacun, ${EDITOR_DOCUMENTS_MAX_COUNT} au plus.`,
  add: "Ajouter des documents",
  remove: (name: string) => `Retirer ${name}`,
};

type Props = {
  /** What to upload for the chosen kind of applicant. */
  what: string;
  documents: PickedDocument[];
  onChange: (documents: PickedDocument[]) => void;
  error?: string;
};

export function DocumentPickerField({ what, documents, onChange, error }: Props) {
  const pickDocuments = async () => {
    const result = await getDocumentAsync({
      type: [...EDITOR_DOCUMENT_TYPES],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      onChange([...documents, ...result.assets.map(toPickedDocument)]);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{texts.label}</Text>
      <Text style={styles.hint}>{what}</Text>
      <Text style={styles.hint}>{texts.hint}</Text>
      {documents.map((document, index) => (
        <View key={`${document.uri}-${index}`} style={styles.document}>
          <Text style={styles.name} numberOfLines={1}>
            {document.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.remove(document.name)}
            onPress={() => onChange(documents.filter((_, other) => other !== index))}
          >
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Button label={texts.add} variant="secondary" onPress={pickDocuments} />
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
  hint: { color: colors.muted },
  document: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1 },
  remove: { fontSize: 18, paddingHorizontal: 8 },
  error: { color: colors.danger },
});
