import { POST_IMAGES_MAX_COUNT } from "@fama/shared";
import { launchImageLibraryAsync } from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import type { LocalFile } from "../../../lib/formDataFile";
import { toLocalImage } from "../images";

const texts = {
  label: "Images (facultatif)",
  hint: `JPEG, PNG ou WebP, 5 Mo maximum, ${POST_IMAGES_MAX_COUNT} au plus. La première sert de couverture. Les métadonnées (position GPS…) sont supprimées.`,
  add: "Ajouter des images",
  remove: (index: number) => `Retirer l'image ${index + 1}`,
};

type Props = { images: LocalFile[]; onChange: (images: LocalFile[]) => void; error?: string };

export function ImagesField({ images, onChange, error }: Props) {
  const remaining = POST_IMAGES_MAX_COUNT - images.length;

  const pickImages = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      onChange([...images, ...result.assets.map(toLocalImage)]);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{texts.label}</Text>
      <Text style={styles.hint}>{texts.hint}</Text>
      <View style={styles.thumbnails}>
        {images.map((image, index) => (
          <Pressable
            key={`${image.uri}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={texts.remove(index)}
            onPress={() => onChange(images.filter((_, other) => other !== index))}
          >
            <Image source={{ uri: image.uri }} style={styles.thumbnail} />
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        ))}
      </View>
      {remaining > 0 ? <Button label={texts.add} variant="secondary" onPress={pickImages} /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontWeight: "600" },
  hint: { color: "#555" },
  thumbnails: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbnail: { width: 72, height: 72, borderRadius: 6, backgroundColor: "#ddd" },
  remove: { position: "absolute", top: 2, right: 6, color: "#fff", fontWeight: "bold" },
  error: { color: "#c1121f" },
});
