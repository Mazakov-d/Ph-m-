import { VOTE_OPTION_LABEL_MAX_LENGTH, VOTE_OPTIONS_MAX, VOTE_OPTIONS_MIN } from "@fama/shared";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors } from "../../../components/ui/theme";

const texts = {
  label: "Choix de réponse proposés aux lecteurs",
  hint: `De ${VOTE_OPTIONS_MIN} à ${VOTE_OPTIONS_MAX} choix, ${VOTE_OPTION_LABEL_MAX_LENGTH} caractères maximum, tous différents. Ils ne pourront plus être modifiés.`,
  choice: (index: number) => `Choix ${index + 1}`,
  add: "Ajouter un choix",
  remove: (index: number) => `Retirer le choix ${index + 1}`,
};

type Props = { options: string[]; onChange: (options: string[]) => void; error?: string };

/** SPEC §7: the answer choices of an opinion, set when publishing. */
export function VoteOptionsField({ options, onChange, error }: Props) {
  const update = (index: number, value: string) =>
    onChange(options.map((option, other) => (other === index ? value : option)));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{texts.label}</Text>
      <Text style={styles.hint}>{texts.hint}</Text>
      {options.map((option, index) => (
        <View key={index} style={styles.row}>
          <TextInput
            accessibilityLabel={texts.choice(index)}
            value={option}
            onChangeText={(value) => update(index, value)}
            maxLength={VOTE_OPTION_LABEL_MAX_LENGTH}
            style={styles.input}
          />
          {options.length > VOTE_OPTIONS_MIN ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.remove(index)}
              onPress={() => onChange(options.filter((_, other) => other !== index))}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {options.length < VOTE_OPTIONS_MAX ? (
        <Button label={texts.add} variant="secondary" onPress={() => onChange([...options, ""])} />
      ) : null}
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
  remove: { fontSize: 18, paddingHorizontal: 8 },
  error: { color: colors.danger },
});
