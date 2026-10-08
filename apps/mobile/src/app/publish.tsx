import { can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { PublishForm } from "../features/posts/components/PublishForm";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../components/ui/theme";

const texts = {
  title: "Publier",
  forbidden: "Seuls les éditeurs validés peuvent publier.",
  notice:
    "Une publication ne peut plus être modifiée ensuite : seule une correction publique pourra y être ajoutée.",
};

export default function PublishScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: texts.title }} />
      {/* SPEC §2.5: reserved to validated editors (the API checks again). */}
      {can(user, "post.create") ? (
        <>
          <Text style={styles.notice}>{texts.notice}</Text>
          <PublishForm onPublished={(postId) => router.replace(`/posts/${postId}`)} />
        </>
      ) : (
        <Text>{texts.forbidden}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
  notice: { color: colors.muted },
});
