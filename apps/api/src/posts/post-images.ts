import { HttpStatus } from "@nestjs/common";
import { POST_IMAGE_MAX_WIDTH, type POST_IMAGE_TYPES } from "@fama/shared";
import sharp from "sharp";
import { ApiException } from "../common/errors/api.exception.js";

export type PostImageType = (typeof POST_IMAGE_TYPES)[number];

const SHARP_FORMATS = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const;

/**
 * docs/DECISIONS.md: re-encodes an image so that no metadata survives (GPS position, device)
 * and very wide images are reduced. The format is kept.
 */
export async function sanitizeImage(bytes: Uint8Array, type: PostImageType): Promise<Uint8Array> {
  try {
    const output = await sharp(bytes)
      // Applies the EXIF orientation to the pixels before the EXIF data is dropped.
      .rotate()
      .resize({ width: POST_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .toFormat(SHARP_FORMATS[type])
      .toBuffer();
    return new Uint8Array(output);
  } catch {
    throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", "The image cannot be read");
  }
}
