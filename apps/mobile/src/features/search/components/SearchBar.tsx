import { SEARCH_QUERY_MAX_LENGTH } from "@fama/shared";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../../components/ui/theme";

const texts = {
  placeholder: "Rechercher un média, un titre, un sujet…",
  clear: "Effacer la recherche",
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Interface brief: touching the bar shows the filters. */
  onFocus: () => void;
};

/** SPEC §4.4: one search bar at the top of the feed. */
export function SearchBar({ value, onChange, onFocus }: Props) {
  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel={texts.placeholder}
        placeholder={texts.placeholder}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
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
  // Interface brief: a compact bar, centred above the feed.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  clear: { fontSize: 18, paddingHorizontal: 6 },
});
