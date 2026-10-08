import type { PostPublic } from "@fama/shared";
import { Image, StyleSheet, View } from "react-native";
import { FormattedText } from "../../../components/ui/FormattedText";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";

/**
 * Interface brief: title and summary, then the article and the pictures in the order chosen by
 * the editor, with their typefaces; sizes are fixed by the app.
 */
export function PostBlocks({ post }: { post: PostPublic }) {
  const body = (
    <FormattedText
      key="body"
      text={post.body}
      typeface={post.typefaces.body}
      size={textSizes.body}
      style={styles.body}
    />
  );
  const pictures = post.images.map((image) => (
    <Image
      key={image.id}
      source={{ uri: apiClient.url(image.path) }}
      style={styles.image}
      accessibilityIgnoresInvertColors
    />
  ));

  return (
    <View style={styles.blocks}>
      <FormattedText
        text={post.title}
        typeface={post.typefaces.title}
        size={textSizes.postTitle}
        style={styles.title}
      />
      <FormattedText
        text={post.summary}
        typeface={post.typefaces.summary}
        size={textSizes.summary}
        style={styles.summary}
      />
      {post.layout === "MEDIA_FIRST" ? [...pictures, body] : [body, ...pictures]}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.md },
  title: { fontWeight: "bold", color: colors.text },
  summary: { fontWeight: "600", color: colors.text },
  body: { lineHeight: 24, color: colors.text },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
});
