import { POST_VIDEO_MAX_SECONDS } from "@fama/shared";
import { launchImageLibraryAsync } from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { colors, spacing } from "../../../components/ui/theme";
import { type LocalVideo, toLocalVideo } from "../images";
import { formatDuration } from "../texts";

const texts = {
  label: "Vidéo (facultatif)",
  hint: "Une vidéo MP4 ou MOV, 3 minutes et 200 Mo au plus. Les métadonnées (position GPS…) sont supprimées.",
  add: "Ajouter une vidéo",
  remove: "Retirer la vidéo",
};

type Props = {
  video: LocalVideo | null;
  onChange: (video: LocalVideo | null) => void;
  error?: string;
};

/** docs/DECISIONS.md (videos): one video per post, next to the pictures. */
export function VideoField({ video, onChange, error }: Props) {
  const pickVideo = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: POST_VIDEO_MAX_SECONDS,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange(toLocalVideo(asset));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{texts.label}</Text>
      <Text style={styles.hint}>{texts.hint}</Text>
      {video ? (
        <View style={styles.row}>
          <Text
            style={styles.name}
          >{`${video.file.name} · ${formatDuration(video.durationSeconds)}`}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.remove}
            onPress={() => onChange(null)}
          >
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <Button label={texts.add} variant="secondary" onPress={pickVideo} />
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: "600" },
  hint: { color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { flex: 1, color: colors.text },
  remove: { fontSize: 16, color: colors.danger, paddingHorizontal: spacing.sm },
  error: { color: colors.danger },
});
