import type { PostPublic } from "@fama/shared";
import { Image, StyleSheet, View } from "react-native";
import { FormattedText } from "../../../components/ui/FormattedText";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";
import { PostVideoPlayer } from "./PostVideoPlayer";

/**
 * Interface brief: one centred column: the title, the summary, then the article and the
 * pictures in the editor's order, with their typefaces (sizes fixed by the app).
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
  const images = post.images.map((image) => (
    <Image
      key={image.id}
      source={{ uri: apiClient.url(image.path) }}
      style={styles.image}
      accessibilityIgnoresInvertColors
    />
  ));
  // docs/DECISIONS.md (videos): the video comes first among the media.
  const pictures = post.video
    ? [<PostVideoPlayer key="video" video={post.video} />, ...images]
    : images;

  return (
    <View style={styles.blocks}>
      <FormattedText
        text={post.title}
        typeface={post.typefaces.title}
        size={textSizes.postTitle}
        alwaysBold
        style={styles.title}
      />
      <FormattedText
        text={post.summary}
        typeface={post.typefaces.summary}
        size={textSizes.summary}
        alwaysBold
        style={styles.text}
      />
      {post.layout === "MEDIA_FIRST" ? [...pictures, body] : [body, ...pictures]}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.md },
  title: { color: colors.text, textAlign: "center" },
  text: { color: colors.text },
  body: { lineHeight: 24, color: colors.text },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
});
