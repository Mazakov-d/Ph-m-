import {
  type CommentModeration,
  type ReviewQueueItemModeration,
  type SanctionAppealModeration,
  stripInlineFormatting,
} from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { postReportReasonLabel } from "../../reports/texts";
import { SANCTION_LABELS, sanctionErrorMessage } from "../../sanctions/texts";
import { useDecideComment, useDecideOpinion, useDecideSanctionAppeal } from "../api";
import { RemovalDecision } from "./RemovalDecision";
import { colors } from "../../../components/ui/theme";

function Reports({ reports }: { reports: CommentModeration["reports"] }) {
  return (
    <>
      {reports.map((report) => (
        <Text key={report.id} style={styles.muted}>
          {`• ${postReportReasonLabel(report.reason)}${report.details ? ` : ${report.details}` : ""}`}
        </Text>
      ))}
    </>
  );
}

/** A comment under review (SPEC §6.2 step 4). */
export function CommentModerationCard({ comment }: { comment: CommentModeration }) {
  const decide = useDecideComment();
  return (
    <View style={styles.card}>
      <Text
        style={styles.meta}
      >{`${comment.authorPseudo} · poids ${comment.totalReportWeight.toFixed(1)}`}</Text>
      <Text>{comment.content}</Text>
      <Reports reports={comment.reports} />
      {decide.error ? <Text style={styles.error}>{sanctionErrorMessage(decide.error)}</Text> : null}
      <RemovalDecision
        loading={decide.isPending}
        onCompliant={() => decide.mutate({ id: comment.id, input: { decision: "VERIFIED" } })}
        onRemove={(choice) =>
          decide.mutate({ id: comment.id, input: { decision: "REMOVED", ...choice } })
        }
      />
    </View>
  );
}

/** A reported opinion (docs/DECISIONS.md, SPEC §6.3). */
export function OpinionModerationCard({ item }: { item: ReviewQueueItemModeration }) {
  const decide = useDecideOpinion();
  return (
    <View style={styles.card}>
      <Text
        style={styles.meta}
      >{`${item.post.editor.pseudo} · poids ${item.score.toFixed(1)}`}</Text>
      <Text style={styles.title}>{stripInlineFormatting(item.post.title)}</Text>
      <Text>{stripInlineFormatting(item.post.summary)}</Text>
      <Reports reports={item.reports} />
      {decide.error ? <Text style={styles.error}>{sanctionErrorMessage(decide.error)}</Text> : null}
      <RemovalDecision
        loading={decide.isPending}
        onCompliant={() => decide.mutate({ id: item.post.id, input: { decision: "COMPLIANT" } })}
        onRemove={(choice) =>
          decide.mutate({ id: item.post.id, input: { decision: "REMOVED", ...choice } })
        }
      />
    </View>
  );
}

/** A sanction appeal, for another moderator or an admin (SPEC §6.3). */
export function SanctionAppealCard({ appeal }: { appeal: SanctionAppealModeration }) {
  const decide = useDecideSanctionAppeal();
  return (
    <View style={styles.card}>
      <Text
        style={styles.meta}
      >{`${appeal.sanctionedPseudo} · ${SANCTION_LABELS[appeal.sanction.type]}`}</Text>
      {appeal.content ? <Text style={styles.quote}>{appeal.content}</Text> : null}
      <Text>{`Contestation : ${appeal.reason}`}</Text>
      {decide.error ? <Text style={styles.error}>{sanctionErrorMessage(decide.error)}</Text> : null}
      <Button
        label="Lever la sanction"
        loading={decide.isPending}
        onPress={() => decide.mutate({ id: appeal.id, accepted: true })}
      />
      <Button
        label="Maintenir la sanction"
        variant="secondary"
        onPress={() => decide.mutate({ id: appeal.id, accepted: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 16, borderRadius: 8, backgroundColor: colors.surface },
  meta: { fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "bold" },
  muted: { color: colors.muted },
  quote: { fontStyle: "italic", color: colors.text },
  error: { color: colors.danger },
});
