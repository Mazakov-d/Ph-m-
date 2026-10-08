import { EDITOR_REPLY_MAX_LENGTH } from "@fama/shared";
import { TextActionForm } from "../../../components/ui/TextActionForm";
import { useEditorReviewAction } from "../api";
import { reviewErrorMessage } from "../texts";

const texts = { label: "Publier une correction", send: "Publier" };

/** SPEC §3: the author corrects the post at any time; the correction shows under it. */
export function CorrectionForm({ postId }: { postId: string }) {
  const mutation = useEditorReviewAction(postId, "correction");
  return (
    <TextActionForm
      label={texts.label}
      submitLabel={texts.send}
      maxLength={EDITOR_REPLY_MAX_LENGTH}
      loading={mutation.isPending}
      error={mutation.error ? reviewErrorMessage(mutation.error) : undefined}
      onSubmit={(text, done) => mutation.mutate(text, { onSuccess: done })}
    />
  );
}
