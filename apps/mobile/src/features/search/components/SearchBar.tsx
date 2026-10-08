import { SEARCH_QUERY_MAX_LENGTH } from "@fama/shared";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const texts = {
  placeholder: "Rechercher un média, un titre, un sujet…",
  clear: "Effacer la recherche",
};

type Props = { value: string; onChange: (value: string) => void };

/** SPEC §4.4: one search bar at the top of the feed. */
export function SearchBar({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel={texts.placeholder}
        placeholder={texts.placeholder}
        value={value}
        onChangeText={onChange}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={texts.clear}
          onPress={() => onChange("")}
        >
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  clear: { fontSize: 18, paddingHorizontal: 6 },
});
