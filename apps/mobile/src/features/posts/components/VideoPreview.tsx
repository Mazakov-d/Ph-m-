import type { PostVideoPublic } from "@fama/shared";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";
import { formatDuration } from "../texts";

const texts = { label: (duration: string) => `Vidéo de ${duration}` };

/** docs/DECISIONS.md (videos): on a feed card, the still image with ▶ and the duration. */
export function VideoPreview({ video }: { video: PostVideoPublic }) {
  const duration = formatDuration(video.durationSeconds);
  return (
    <View accessible accessibilityLabel={texts.label(duration)} style={styles.box}>
      <Image
        source={{ uri: apiClient.url(video.posterPath) }}
        style={styles.poster}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.play}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
      <Text style={styles.duration}>{duration}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.sm, overflow: "hidden" },
  poster: { width: "100%", height: "100%", backgroundColor: colors.border },
  play: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 48,
    height: 48,
    marginTop: -24,
    marginLeft: -24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  playIcon: { color: colors.onBrand, fontSize: 20, marginLeft: 3 },
  duration: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: 4,
    color: colors.onBrand,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
});
