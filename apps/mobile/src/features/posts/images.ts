import {
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_TYPES,
  POST_IMAGES_MAX_COUNT,
  POST_VIDEO_MAX_BYTES,
  POST_VIDEO_MAX_SECONDS,
  POST_VIDEO_TYPES,
} from "@fama/shared";
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

/** docs/DECISIONS.md (videos): the chosen video and its duration (given by the picker). */
export type LocalVideo = { file: LocalFile; durationSeconds: number };

const MILLISECONDS_PER_SECOND = 1000;
const ACCEPTED_VIDEO_TYPES: readonly string[] = POST_VIDEO_TYPES;

export function toLocalVideo(asset: ImagePickerAsset): LocalVideo {
  return {
    file: {
      name: asset.fileName ?? "video.mov",
      uri: asset.uri,
      mimeType: asset.mimeType ?? "video/quicktime",
      size: asset.fileSize ?? 0,
      file: asset.file,
    },
    durationSeconds: Math.round((asset.duration ?? 0) / MILLISECONDS_PER_SECOND),
  };
}

/** The problem with the chosen video (French), or null. The API checks again. */
export function videoProblem(video: LocalVideo | null): string | null {
  if (!video) return null;
  if (!ACCEPTED_VIDEO_TYPES.includes(video.file.mimeType)) {
    return "Seules les vidéos MP4 et MOV sont acceptées.";
  }
  if (video.file.size > POST_VIDEO_MAX_BYTES) {
    return `La vidéo dépasse ${POST_VIDEO_MAX_BYTES / (1024 * 1024)} Mo.`;
  }
  if (video.durationSeconds > POST_VIDEO_MAX_SECONDS) {
    return `La vidéo dépasse ${POST_VIDEO_MAX_SECONDS / 60} minutes.`;
  }
  return null;
}
