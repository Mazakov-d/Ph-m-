import { can, type EditorStatus } from "@fama/shared";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { ApplicationReviewCard } from "../../features/editors/components/ApplicationReviewCard";
import { useEditorApplications } from "../../features/editors/moderationApi";
import { editorErrorMessage } from "../../features/editors/texts";
import { useAuth } from "../../providers/AuthProvider";

const texts = {
  title: "Demandes éditeurs",
  forbidden: "Cet écran est réservé à l'équipe de modération.",
  pending: "En attente",
  independent: "Indépendants (à certifier)",
  empty: "Aucune demande.",
};

export default function EditorApplicationsScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<EditorStatus>("PENDING");
  const canReview = can(user, "editor.validateIndependent");
  const applications = useEditorApplications(status);

  if (!canReview) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: texts.title }} />
        <Text>{texts.forbidden}</Text>
      </View>
    );
  }

  const items = applications.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <View style={styles.screen}>
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
      <FlatList
        data={items}
        keyExtractor={(application) => application.userId}
        renderItem={({ item }) => <ApplicationReviewCard application={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={applications.isSuccess ? <Text>{texts.empty}</Text> : null}
        onEndReached={() => {
          if (applications.hasNextPage && !applications.isFetchingNextPage) {
            void applications.fetchNextPage();
          }
        }}
        ListFooterComponent={applications.isFetchingNextPage ? <ActivityIndicator /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 24 },
  filters: { padding: 16, gap: 8 },
  list: { padding: 16, gap: 16 },
  error: { color: "#c1121f", paddingHorizontal: 16 },
});
