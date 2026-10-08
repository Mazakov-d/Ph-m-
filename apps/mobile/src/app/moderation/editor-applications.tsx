import { can, type EditorStatus } from "@fama/shared";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { ApplicationReviewCard } from "../../features/editors/components/ApplicationReviewCard";
import { useEditorApplications } from "../../features/editors/moderationApi";
import { editorErrorMessage } from "../../features/editors/texts";
import { useAuth } from "../../providers/AuthProvider";
import { colors } from "../../components/ui/theme";
import { CenteredBox } from "../../components/ui/CenteredBox";

const texts = {
  title: "Demandes éditeurs",
  forbidden: "Cet écran est réservé à l'équipe de modération.",
  pending: "En attente",
  independent: "Indépendants (à certifier)",
  empty: "Aucune demande.",
  more: "Voir plus de demandes",
};

export default function EditorApplicationsScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<EditorStatus>("PENDING");
  const canReview = can(user, "editor.validateIndependent");
  const applications = useEditorApplications(status);

  if (!canReview) {
    return (
      <CenteredBox size="wide">
        <Stack.Screen options={{ title: texts.title }} />
        <Text>{texts.forbidden}</Text>
      </CenteredBox>
    );
  }

  const items = applications.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CenteredBox size="wide">
      <Stack.Screen options={{ title: texts.title }} />
      <View style={styles.filters}>
        <Button
          label={texts.pending}
          variant={status === "PENDING" ? "primary" : "secondary"}
          onPress={() => setStatus("PENDING")}
        />
        {/* Only an admin can act on independent editors (certification). */}
        {can(user, "editor.validateCertified") ? (
          <Button
            label={texts.independent}
            variant={status === "INDEPENDENT" ? "primary" : "secondary"}
            onPress={() => setStatus("INDEPENDENT")}
          />
        ) : null}
      </View>
      {applications.isPending ? <ActivityIndicator /> : null}
      {applications.error ? (
        <Text style={styles.error}>{editorErrorMessage(applications.error)}</Text>
      ) : null}
      {items.map((application) => (
        <ApplicationReviewCard key={application.userId} application={application} />
      ))}
      {applications.isSuccess && items.length === 0 ? <Text>{texts.empty}</Text> : null}
      {applications.hasNextPage ? (
        <Button
          label={texts.more}
          variant="secondary"
          loading={applications.isFetchingNextPage}
          onPress={() => void applications.fetchNextPage()}
        />
      ) : null}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 8 },
  error: { color: colors.danger },
});
