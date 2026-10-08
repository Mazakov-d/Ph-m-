import type { PostPublic } from "@fama/shared";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { FormattedText } from "../../../components/ui/FormattedText";
import { colors, gridBreakpoints, radius, spacing, textSizes } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";

/**
 * Interface brief: the title centred, then the summary, the article and the pictures in the
 * editor's order, with their typefaces (sizes fixed by the app). On a wide window the text and
 * the pictures stand side by side; on a phone they follow each other.
 */
export function PostBlocks({ post }: { post: PostPublic }) {
  const { width } = useWindowDimensions();
  const sideBySide = width >= gridBreakpoints.twoColumns && post.images.length > 0;

  const text = (
    <View key="text" style={[styles.column, sideBySide && styles.half]}>
      <FormattedText
        text={post.summary}
        typeface={post.typefaces.summary}
        size={textSizes.summary}
        alwaysBold
        style={styles.text}
      />
      <FormattedText
        text={post.body}
        typeface={post.typefaces.body}
        size={textSizes.body}
        style={styles.body}
      />
    </View>
  );
  const pictures = (
    <View key="pictures" style={[styles.column, sideBySide && styles.half]}>
      {post.images.map((image) => (
        <Image
          key={image.id}
          source={{ uri: apiClient.url(image.path) }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      ))}
    </View>
  );
  const blocks = post.layout === "MEDIA_FIRST" ? [pictures, text] : [text, pictures];

  return (
    <View style={styles.blocks}>
      <FormattedText
        text={post.title}
        typeface={post.typefaces.title}
        size={textSizes.postTitle}
        alwaysBold
        style={styles.title}
      />
      <View style={sideBySide ? styles.row : styles.column}>{blocks}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.lg },
  title: { color: colors.text, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl },
  column: { gap: spacing.md },
  half: { flex: 1 },
  text: { color: colors.text },
  body: { lineHeight: 24, color: colors.text },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
});
