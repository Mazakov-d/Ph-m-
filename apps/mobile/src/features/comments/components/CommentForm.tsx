import { COMMENT_MAX_LENGTH, createCommentInputSchema } from "@fama/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, radius, spacing } from "../../../components/ui/theme";
import { useCreateComment } from "../api";
import { commentErrorMessage } from "../texts";

const texts = {
  comment: "Votre commentaire",
  reply: "Votre réponse",
  placeholder: "Écrire un commentaire…",
  empty: "Écrivez quelque chose.",
  tooLong: `${COMMENT_MAX_LENGTH} caractères maximum.`,
  send: "Publier",
  cancel: "Annuler",
};

type Props = { postId: string; parentId: string | null; onDone?: () => void };

/** Interface brief: a text zone under the comments; the Enter key publishes. */
export function CommentForm({ postId, parentId, onDone }: Props) {
  const createComment = useCreateComment(postId);
  const { control, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(createCommentInputSchema),
    defaultValues: { postId, parentId, content: "" },
  });
  const contentError = formState.errors.content;
  const label = parentId ? texts.reply : texts.comment;

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
      <View style={styles.composer}>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <TextInput
              accessibilityLabel={label}
              placeholder={parentId ? texts.reply : texts.placeholder}
              value={field.value}
              onChangeText={field.onChange}
              onSubmitEditing={() => void onSubmit()}
              // The text wraps over several lines, but Enter publishes instead of a new line.
              multiline
              submitBehavior="submit"
              returnKeyType="send"
              maxLength={COMMENT_MAX_LENGTH}
              style={[styles.input, contentError ? styles.inputError : null]}
            />
          )}
        />
        <Button label={texts.send} onPress={onSubmit} loading={createComment.isPending} />
      </View>
      {contentError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {contentError.type === "too_big" ? texts.tooLong : texts.empty}
        </Text>
      ) : null}
      {createComment.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {commentErrorMessage(createComment.error)}
        </Text>
      ) : null}
      {onDone ? <Button label={texts.cancel} variant="secondary" onPress={onDone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger },
});
