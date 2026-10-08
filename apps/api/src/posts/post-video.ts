import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { HttpStatus } from "@nestjs/common";
import { POST_VIDEO_MAX_SECONDS, POST_VIDEO_MAX_WIDTH } from "@fama/shared";
import { z } from "zod";
import { ApiException } from "../common/errors/api.exception.js";

const run = promisify(execFile);
// ffmpeg-static and ffprobe-static are CommonJS packages that export the path of their binary.
const require = createRequire(import.meta.url);
const FFMPEG_PATH = z.string().nullable().parse(require("ffmpeg-static"));
const FFPROBE_PATH = z.object({ path: z.string() }).parse(require("ffprobe-static")).path;
// Large enough for the output of ffprobe and ffmpeg's logs.
const OUTPUT_BUFFER_BYTES = 10 * 1024 * 1024;
// Visual quality of H.264 (lower is better and heavier); 26 keeps a phone video light.
const VIDEO_QUALITY_CRF = "26";
const POSTER_AT_SECONDS = "1";

const probeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
  format: z.object({ duration: z.coerce.number() }),
});

export type ProbedVideo = { durationSeconds: number; width: number; height: number };

function ffmpeg(): string {
  if (!FFMPEG_PATH) {
    throw new Error("ffmpeg is not available on this platform");
  }
  return FFMPEG_PATH;
}

/**
 * docs/DECISIONS.md (videos): reads the duration and size of an uploaded video; refuses a file
 * that is not a video, and a video over POST_VIDEO_MAX_SECONDS.
 */
export async function probeVideo(path: string): Promise<ProbedVideo> {
  let probed: z.infer<typeof probeSchema>;
  try {
    const { stdout } = await run(
      FFPROBE_PATH,
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
      { maxBuffer: OUTPUT_BUFFER_BYTES },
    );
    probed = probeSchema.parse(JSON.parse(stdout));
  } catch {
    throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_VIDEO", "Not a readable video");
  }
  const video = probed.streams.find((stream) => stream.codec_type === "video");
  if (!video?.width || !video.height) {
    throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_VIDEO", "No video stream");
  }
  if (probed.format.duration > POST_VIDEO_MAX_SECONDS) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      "VIDEO_TOO_LONG",
      `A video lasts ${POST_VIDEO_MAX_SECONDS} seconds at most`,
    );
  }
  return {
    durationSeconds: Math.round(probed.format.duration),
    width: video.width,
    height: video.height,
  };
}

/**
 * docs/DECISIONS.md (videos): converts to an MP4 every phone and browser plays (H.264 + AAC, at
 * most POST_VIDEO_MAX_WIDTH wide), without any metadata (place, device), ready to start before
 * the end is downloaded (faststart).
 */
export async function convertVideo(input: string, output: string): Promise<void> {
  await run(
    ffmpeg(),
    [
      "-y",
      "-i",
      input,
      "-map_metadata",
      "-1",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-vf",
      `scale='min(${POST_VIDEO_MAX_WIDTH},iw)':-2`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      VIDEO_QUALITY_CRF,
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      output,
    ],
    { maxBuffer: OUTPUT_BUFFER_BYTES },
  );
}

/** The still image shown before the video plays (a JPEG taken after one second, or the start). */
export async function extractPoster(video: string, output: string): Promise<void> {
  const grab = (at: string) =>
    run(ffmpeg(), ["-y", "-ss", at, "-i", video, "-frames:v", "1", "-q:v", "3", output], {
      maxBuffer: OUTPUT_BUFFER_BYTES,
    });
  try {
    await grab(POSTER_AT_SECONDS);
  } catch {
    // A video shorter than one second.
    await grab("0");
  }
}
