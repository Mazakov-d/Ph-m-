import { APPEAL_MAX_LENGTH, type SanctionPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { TextActionForm } from "../../../components/ui/TextActionForm";
import { formatPublishedAt } from "../../posts/texts";
import { useAppealSanction } from "../api";
import { SANCTION_APPEAL_TEXTS, SANCTION_LABELS, sanctionErrorMessage } from "../texts";

const texts = {
  cause: (sanction: SanctionPublic) =>
    sanction.postId
      ? "Pour une opinion retirée par la modération"
      : "Pour un commentaire retiré par la modération",
  date: (date: string) => `Prononcée ${formatPublishedAt(date)}`,
  until: (date: string) => `Jusqu'au ${new Date(date).toLocaleString("fr-FR")}`,
  appeal: "Contester cette sanction",
  send: "Envoyer la contestation",
};

export function SanctionCard({ sanction }: { sanction: SanctionPublic }) {
  const appeal = useAppealSanction();
  const appealText = SANCTION_APPEAL_TEXTS[sanction.appealState];
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{SANCTION_LABELS[sanction.type]}</Text>
      <Text style={styles.muted}>{texts.cause(sanction)}</Text>
      <Text style={styles.muted}>{texts.date(sanction.createdAt)}</Text>
      {sanction.endsAt && !sanction.liftedAt ? <Text>{texts.until(sanction.endsAt)}</Text> : null}
      {appealText ? <Text style={styles.appeal}>{appealText}</Text> : null}
      {/* SPEC §6.3: contestable once. */}
      {sanction.appealState === "NONE" ? (
        <TextActionForm
          label={texts.appeal}
          submitLabel={texts.send}
          maxLength={APPEAL_MAX_LENGTH}
          loading={appeal.isPending}
          error={appeal.error ? sanctionErrorMessage(appeal.error) : undefined}
          onSubmit={(reason, done) =>
            appeal.mutate({ sanctionId: sanction.id, reason }, { onSuccess: done })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 16, borderRadius: 8, backgroundColor: "#fff" },
  type: { fontSize: 17, fontWeight: "bold" },
  muted: { color: "#555" },
  appeal: { fontStyle: "italic" },
});
