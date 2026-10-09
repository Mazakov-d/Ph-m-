import { can } from "@fama/shared";
import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, spacing } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { useJuryAssignments, useJuryVolunteer, useSetJuryVolunteer } from "../api";

const texts = {
  volunteer: "Je veux être juré",
  explanation:
    "Des lecteurs volontaires, inscrits depuis 6 mois et sans sanction, sont tirés au sort pour examiner les articles signalés. Vous voteriez sous 48 heures, de façon anonyme.",
  assignments: (pending: number) => (pending > 0 ? `Mes jurys (${pending} à voter)` : "Mes jurys"),
};

/** SPEC §5.8: in the account, a reader volunteers for juries and opens the ones they sit on. */
export function JurySection() {
  const router = useRouter();
  const { user } = useAuth();
  const allowed = can(user, "jury.serve");
  const volunteer = useJuryVolunteer(allowed);
  const setVolunteer = useSetJuryVolunteer();
  const assignments = useJuryAssignments(allowed);
  if (!allowed) return null;

  const seats = assignments.data ?? [];
  const pending = seats.filter((seat) => seat.status === "PENDING").length;
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>{texts.volunteer}</Text>
        <Switch
          accessibilityLabel={texts.volunteer}
          value={volunteer.data?.volunteer ?? false}
          disabled={volunteer.isPending || setVolunteer.isPending}
          onValueChange={(value) => setVolunteer.mutate(value)}
        />
      </View>
      <Text style={styles.muted}>{texts.explanation}</Text>
      {seats.length > 0 ? (
        <Button
          label={texts.assignments(pending)}
          variant="secondary"
          onPress={() => router.push("/jury")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  label: { flex: 1, fontWeight: "600", color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
});
