import {
  APPEAL_MAX_LENGTH,
  EDITOR_APPEAL_HOURS,
  EDITOR_REPLY_HOURS,
  EDITOR_REPLY_MAX_LENGTH,
  isWithinEditorWindow,
  type ReviewPublic,
} from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { type EditorReviewAction, useEditorReviewAction } from "../api";
import { reviewErrorMessage } from "../texts";
import { TextActionForm } from "../../../components/ui/TextActionForm";

const texts = {
  intro:
    "Vous avez 48 heures après le verdict pour répondre, corriger ou faire appel (une seule fois).",
  reply: "Répondre au verdict",
  correction: "Publier une correction",
  appeal: "Faire appel",
  send: "Publier",
  sendAppeal: "Envoyer l'appel",
};

/** SPEC §5.5: the author's answers to the verdict, while the 48-hour window is open. */
export function EditorReviewActions({ review }: { review: ReviewPublic }) {
  const now = new Date();
  const verdictAt = new Date(review.createdAt);
  const canReply = isWithinEditorWindow(verdictAt, now, EDITOR_REPLY_HOURS);
  const canAppeal =
    review.appealState === "NONE" && isWithinEditorWindow(verdictAt, now, EDITOR_APPEAL_HOURS);
  if (!canReply && !canAppeal) {
    return null;
  }
  return (
    <View style={styles.actions}>
      <Text style={styles.intro}>{texts.intro}</Text>
      {canReply && !review.editorReply ? (
        <Action
          postId={review.postId}
          action="reply"
          label={texts.reply}
          submit={texts.send}
          max={EDITOR_REPLY_MAX_LENGTH}
        />
      ) : null}
      {canReply ? (
        <Action
          postId={review.postId}
          action="correction"
          label={texts.correction}
          submit={texts.send}
          max={EDITOR_REPLY_MAX_LENGTH}
        />
      ) : null}
      {canAppeal ? (
        <Action
          postId={review.postId}
          action="appeal"
          label={texts.appeal}
          submit={texts.sendAppeal}
          max={APPEAL_MAX_LENGTH}
        />
      ) : null}
    </View>
  );
}

type ActionProps = {
  postId: string;
  action: EditorReviewAction;
  label: string;
  submit: string;
  max: number;
};

function Action({ postId, action, label, submit, max }: ActionProps) {
  const mutation = useEditorReviewAction(postId, action);
  return (
    <TextActionForm
      label={label}
      submitLabel={submit}
      maxLength={max}
      loading={mutation.isPending}
      error={mutation.error ? reviewErrorMessage(mutation.error) : undefined}
      onSubmit={(text, done) => mutation.mutate(text, { onSuccess: done })}
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8, marginTop: 8 },
  intro: { color: "#555" },
});
