import type { VoteOptionPublic } from "@fama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";

const texts = {
  validate: "Valider mon vote",
  final: "Votre vote est définitif : il ne pourra plus être changé.",
};

type Props = {
  options: VoteOptionPublic[];
  onValidate: (optionId: string) => void;
  loading: boolean;
};

/** SPEC §7: select a choice, then confirm it (the vote is final). */
export function VoteChoices({ options, onValidate, loading }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => setSelectedId(option.id)}
            style={[styles.choice, selected && styles.selected]}
          >
            <Text style={[styles.radio, selected && styles.selectedText]}>
              {selected ? "●" : "○"}
            </Text>
            <Text style={selected ? styles.selectedText : undefined}>{option.label}</Text>
          </Pressable>
        );
      })}
      {selectedId ? (
        <>
          <Text style={styles.final}>{texts.final}</Text>
          <Button label={texts.validate} loading={loading} onPress={() => onValidate(selectedId)} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { gap: 8 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  selected: { borderColor: "#1d3557", backgroundColor: "#eef2f8" },
  radio: { fontSize: 16, color: "#666" },
  selectedText: { color: "#1d3557", fontWeight: "600" },
  final: { color: "#555" },
});
