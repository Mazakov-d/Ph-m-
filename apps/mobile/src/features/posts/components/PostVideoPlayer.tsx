import type { PostVideoPublic } from "@fama/shared";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet } from "react-native";
import { colors, radius } from "../../../components/ui/theme";
import { apiClient } from "../../../lib/apiClient";

const texts = { label: "Vidéo de la publication" };

/** docs/DECISIONS.md (videos): the video of a post, with the player's own controls. */
export function PostVideoPlayer({ video }: { video: PostVideoPublic }) {
  // The player only starts when the reader presses play.
  const player = useVideoPlayer(apiClient.url(video.path));
  return (
    <VideoView
      accessibilityLabel={texts.label}
      player={player}
      nativeControls
      // Interface brief: the video can be enlarged to the whole screen.
      fullscreenOptions={{ enable: true }}
      contentFit="contain"
      style={styles.video}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    backgroundColor: colors.text,
  },
});
