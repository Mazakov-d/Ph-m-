import type { PostPublic } from "@fama/shared";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { FormattedText } from "../../../components/ui/FormattedText";
import { colors, radius, spacing, textSizes } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";
import { ImageViewer } from "./ImageViewer";
import { PostVideoPlayer } from "./PostVideoPlayer";

const texts = { enlarge: (index: number) => `Agrandir l'image ${index}` };

/**
 * Interface brief: one centred column: the title, the summary, then the article and the
 * pictures in the editor's order, with their typefaces (sizes fixed by the app).
 */
export function PostBlocks({ post }: { post: PostPublic }) {
  // Interface brief: a picture opens enlarged when touched.
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const body = (
    <FormattedText
      key="body"
      text={post.body}
      typeface={post.typefaces.body}
      size={textSizes.body}
      style={styles.body}
    />
  );
  const images = post.images.map((image, index) => (
    <Pressable
      key={image.id}
      accessibilityRole="imagebutton"
      accessibilityLabel={texts.enlarge(index + 1)}
      onPress={() => setEnlarged(apiClient.url(image.path))}
    >
      <Image
        source={{ uri: apiClient.url(image.path) }}
        style={styles.image}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
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
      <ImageViewer uri={enlarged} onClose={() => setEnlarged(null)} />
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
