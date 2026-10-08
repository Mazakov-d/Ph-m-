import { type AppealModeration, VERDICT_LABELS } from "@fama/shared";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";

const texts = {
  verdict: (label: string) => `Verdict contesté : ${label}`,
  reason: "Raison de l'appel",
  read: "Lire l'article",
  decide: "Trancher l'appel",
};

/** docs/DECISIONS.md: an appeal waiting for another moderator. */
export function AppealCard({ appeal }: { appeal: AppealModeration }) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{appeal.post.title}</Text>
      <Text style={styles.muted}>{appeal.post.editor.pseudo}</Text>
      <Text style={styles.verdict}>{texts.verdict(VERDICT_LABELS[appeal.review.verdict])}</Text>
      <Text>{appeal.review.publicNote}</Text>
      <Text style={styles.heading}>{texts.reason}</Text>
      <Text>{appeal.reason}</Text>
      <Button
        label={texts.read}
        variant="secondary"
        onPress={() => router.push(`/posts/${appeal.post.id}`)}
      />
      <Button
        label={texts.decide}
        onPress={() => router.push(`/moderation/appeals/${appeal.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 16, borderRadius: 8, backgroundColor: "#fff" },
  title: { fontSize: 17, fontWeight: "bold" },
  muted: { color: "#555" },
  verdict: { fontWeight: "600" },
  heading: { fontWeight: "600", marginTop: 4 },
});
