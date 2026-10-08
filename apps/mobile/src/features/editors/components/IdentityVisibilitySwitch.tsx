import { StyleSheet, Switch, Text, View } from "react-native";
import { useUpdateEditorProfile } from "../api";
import { editorErrorMessage } from "../texts";
import { colors } from "../../../components/ui/theme";

const texts = {
  label: "Afficher mon identité sur mon profil public",
  hint: "Votre identité est toujours vérifiée et connue de l'équipe ; ce réglage décide seulement si elle est visible des lecteurs.",
};

export function IdentityVisibilitySwitch({ value }: { value: boolean }) {
  const updateProfile = useUpdateEditorProfile();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{texts.label}</Text>
        <Switch
          accessibilityLabel={texts.label}
          value={value}
          disabled={updateProfile.isPending}
          onValueChange={(showIdentityPublicly) => updateProfile.mutate({ showIdentityPublicly })}
        />
      </View>
      <Text style={styles.hint}>{texts.hint}</Text>
      {updateProfile.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {editorErrorMessage(updateProfile.error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flex: 1, fontWeight: "600" },
  hint: { color: colors.muted },
  error: { color: colors.danger },
});
