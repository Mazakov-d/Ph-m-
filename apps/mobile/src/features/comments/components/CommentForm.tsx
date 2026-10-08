import { COMMENT_MAX_LENGTH, createCommentInputSchema } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { useCreateComment } from "../api";
import { commentErrorMessage } from "../texts";

const texts = {
  comment: "Votre commentaire",
  reply: "Votre réponse",
  empty: "Écrivez quelque chose.",
  tooLong: `${COMMENT_MAX_LENGTH} caractères maximum.`,
  send: "Publier",
  cancel: "Annuler",
};

type Props = { postId: string; parentId: string | null; onDone?: () => void };

export function CommentForm({ postId, parentId, onDone }: Props) {
  const createComment = useCreateComment(postId);
  const { control, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(createCommentInputSchema),
    defaultValues: { postId, parentId, content: "" },
  });
  const contentError = formState.errors.content;

  const onSubmit = handleSubmit((input) =>
    createComment.mutate(input, {
      onSuccess: () => {
        reset();
        onDone?.();
      },
    }),
  );

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="content"
        render={({ field }) => (
          <TextField
            label={parentId ? texts.reply : texts.comment}
            value={field.value}
            onChangeText={field.onChange}
            multiline
            maxLength={COMMENT_MAX_LENGTH}
            error={
              contentError
                ? contentError.type === "too_big"
                  ? texts.tooLong
                  : texts.empty
                : undefined
            }
          />
        )}
      />
      {createComment.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {commentErrorMessage(createComment.error)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label={texts.send} onPress={onSubmit} loading={createComment.isPending} />
        {onDone ? <Button label={texts.cancel} variant="secondary" onPress={onDone} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  actions: { gap: 8 },
  error: { color: "#c1121f" },
});
