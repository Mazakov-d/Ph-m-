import { REGION_MAX_LENGTH, Theme, Zone } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { TextField } from "../../../components/ui/TextField";
import { colors, spacing } from "../../../components/ui/theme";
import { THEME_LABELS, ZONE_LABELS } from "../../posts/texts";
import { useCreateAlert } from "../api";
import { alertErrorMessage } from "../texts";

const texts = {
  title: "Nouvelle alerte",
  hint: "Choisissez un thème, une zone, ou les deux (ex. Sport · France).",
  theme: "Thème",
  zone: "Zone",
  region: "Région (facultatif)",
  create: "Créer l'alerte",
};

/** docs/DECISIONS.md (push notifications): an alert by theme and/or zone. */
export function AlertForm() {
  const createAlert = useCreateAlert();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [region, setRegion] = useState("");

  const submit = () =>
    createAlert.mutate(
      { theme, zone, region: zone === "LOCAL" && region.trim() !== "" ? region.trim() : null },
      {
        onSuccess: () => {
          setTheme(null);
          setZone(null);
          setRegion("");
        },
      },
    );

  return (
    <View style={styles.form}>
      <Text style={styles.title}>{texts.title}</Text>
      <Text style={styles.hint}>{texts.hint}</Text>
      <Text style={styles.label}>{texts.theme}</Text>
      <View style={styles.chips}>
        {Theme.options.map((option) => (
          <Chip
            key={option}
            label={THEME_LABELS[option]}
            selected={theme === option}
            onPress={() => setTheme(theme === option ? null : option)}
          />
        ))}
      </View>
      <Text style={styles.label}>{texts.zone}</Text>
      <View style={styles.chips}>
        {Zone.options.map((option) => (
          <Chip
            key={option}
            label={ZONE_LABELS[option]}
            selected={zone === option}
            onPress={() => setZone(zone === option ? null : option)}
          />
        ))}
      </View>
      {zone === "LOCAL" ? (
        <TextField
          label={texts.region}
          value={region}
          onChangeText={setRegion}
          maxLength={REGION_MAX_LENGTH}
        />
      ) : null}
      {createAlert.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {alertErrorMessage(createAlert.error)}
        </Text>
      ) : null}
      <Button label={texts.create} onPress={submit} loading={createAlert.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  title: { fontSize: 18, fontWeight: "bold", color: colors.text },
  hint: { color: colors.muted },
  label: { fontWeight: "600", marginTop: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  error: { color: colors.danger },
});
