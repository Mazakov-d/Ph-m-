import { type Place, placeToZone, Theme } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { colors, spacing } from "../../../components/ui/theme";
import { PlacePicker } from "../../posts/components/PlacePicker";
import { THEME_LABELS } from "../../posts/texts";
import { useCreateAlert } from "../api";
import { alertErrorMessage } from "../texts";

const texts = {
  title: "Nouvelle alerte",
  hint: "Choisissez un thème, un lieu, ou les deux (ex. Sport · Lyon).",
  theme: "Thème",
  zone: "Lieu",
  create: "Créer l'alerte",
};

/** docs/DECISIONS.md (push notifications): an alert by theme and/or zone. */
export function AlertForm() {
  const createAlert = useCreateAlert();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  const submit = () => {
    const stored = place ? placeToZone(place) : { zone: null, locality: null };
    createAlert.mutate(
      { theme, ...stored },
      {
        onSuccess: () => {
          setTheme(null);
          setPlace(null);
        },
      },
    );
  };

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
      <PlacePicker label={texts.zone} value={place} onChange={setPlace} />
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
