import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { apiClient } from "../../../lib/apiClient";
import { apiErrorMessage } from "../errorMessages";

const texts = {
  open: "Supprimer mon compte",
  warning:
    "Votre compte sera supprimé définitivement : vous ne pourrez plus vous connecter. Vos publications et commentaires resteront visibles, signés « Compte supprimé ».",
  password: "Votre mot de passe, pour confirmer",
  confirm: "Supprimer définitivement",
  cancel: "Annuler",
};

/** SPEC §10: deleting one's account from the app (Apple requirement). */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const deletion = useMutation({
    mutationFn: (value: string) =>
      apiClient.delete("/users/me", z.undefined(), { password: value }),
    // The device forgets the session (and the provider shows the visitor's screens).
    onSuccess: () => apiClient.endSession(),
  });

  if (!open) {
    return <Button label={texts.open} variant="secondary" onPress={() => setOpen(true)} />;
  }
  return (
    <View style={styles.panel}>
      <Text>{texts.warning}</Text>
      <TextField
        label={texts.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {deletion.error ? (
        <Text style={styles.error}>{apiErrorMessage(deletion.error).message}</Text>
      ) : null}
      <Button
        label={texts.confirm}
        loading={deletion.isPending}
        onPress={() => password && deletion.mutate(password)}
      />
      <Button label={texts.cancel} variant="secondary" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#fdecea" },
  error: { color: "#c1121f" },
});
