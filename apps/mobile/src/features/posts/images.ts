import { POST_IMAGE_MAX_BYTES, POST_IMAGE_TYPES, POST_IMAGES_MAX_COUNT } from "@fama/shared";
import type { ImagePickerAsset } from "expo-image-picker";
import type { LocalFile } from "../../lib/formDataFile";

export function toLocalImage(asset: ImagePickerAsset, index: number): LocalFile {
  return {
    name: asset.fileName ?? `image-${index + 1}`,
    uri: asset.uri,
    mimeType: asset.mimeType ?? "application/octet-stream",
    size: asset.fileSize ?? 0,
    file: asset.file,
  };
}

const ACCEPTED_TYPES: readonly string[] = POST_IMAGE_TYPES;

/** First problem with the chosen images (French), or null. The API checks again. */
export function imagesProblem(images: LocalFile[]): string | null {
  if (images.length > POST_IMAGES_MAX_COUNT) {
    return `${POST_IMAGES_MAX_COUNT} images maximum.`;
  }
  const wrongType = images.find((image) => !ACCEPTED_TYPES.includes(image.mimeType));
  if (wrongType) {
    return `${wrongType.name} : seules les images JPEG, PNG et WebP sont acceptées.`;
  }
  const tooBig = images.find((image) => image.size > POST_IMAGE_MAX_BYTES);
  if (tooBig) {
    return `${tooBig.name} dépasse ${POST_IMAGE_MAX_BYTES / (1024 * 1024)} Mo.`;
  }
  return null;
}
