import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";

export type RemovalChoice = { isDiscrimination: boolean; reportToPharos: boolean };

const texts = {
  compliant: "Conforme aux règles",
  remove: "Retirer",
  confirm: "Confirmer le retrait",
  cancel: "Annuler",
  discrimination: "Discrimination confirmée (bannissement immédiat)",
  pharos: "À signaler sur PHAROS",
  sanction: "Une sanction sera appliquée selon l'historique de l'auteur.",
};

type Props = {
  onCompliant: () => void;
  onRemove: (choice: RemovalChoice) => void;
  loading: boolean;
};

/** SPEC §6.2 step 4 and §6.3: compliant, or removed with its sanction (confirmed). */
export function RemovalDecision({ onCompliant, onRemove, loading }: Props) {
  const [removing, setRemoving] = useState(false);
  const [isDiscrimination, setIsDiscrimination] = useState(false);
  const [reportToPharos, setReportToPharos] = useState(false);

  if (!removing) {
    return (
      <View style={styles.actions}>
        <Button
          label={texts.compliant}
          variant="secondary"
          loading={loading}
          onPress={onCompliant}
        />
        <Button label={texts.remove} onPress={() => setRemoving(true)} />
      </View>
    );
  }
  return (
    <View style={styles.panel}>
      <Text>{texts.sanction}</Text>
      <Toggle
        label={texts.discrimination}
        value={isDiscrimination}
        onChange={setIsDiscrimination}
      />
      <Toggle label={texts.pharos} value={reportToPharos} onChange={setReportToPharos} />
      <Button
        label={texts.confirm}
        loading={loading}
        onPress={() => onRemove({ isDiscrimination, reportToPharos })}
      />
      <Button label={texts.cancel} variant="secondary" onPress={() => setRemoving(false)} />
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  panel: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#fff3cd" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { flex: 1 },
});
