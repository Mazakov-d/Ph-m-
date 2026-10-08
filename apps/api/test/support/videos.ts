import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const FFMPEG = z.string().parse(require("ffmpeg-static"));
const FFPROBE = z.object({ path: z.string() }).parse(require("ffprobe-static")).path;

/**
 * A real MOV video made by ffmpeg (test pattern and a tone), tagged with a place and a comment
 * like a phone video, `seconds` long.
 */
export async function phoneVideo(seconds = 2): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "test-video-"));
  try {
    const output = join(dir, "video.mov");
    await run(FFMPEG, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=320x240:rate=5:duration=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${seconds}`,
      "-metadata",
      "location=+48.8566+002.3522/",
      "-metadata",
      "comment=Tournée par Clara",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      "-shortest",
      output,
    ]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The metadata tags of a video file (its container), read by ffprobe. */
export async function videoTags(bytes: Uint8Array): Promise<Record<string, string>> {
  const dir = await mkdtemp(join(tmpdir(), "test-probe-"));
  try {
    const file = join(dir, "video.mp4");
    await writeFile(file, bytes);
    const { stdout } = await run(FFPROBE, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      file,
    ]);
    return (
      z
        .object({ format: z.object({ tags: z.record(z.string(), z.string()).optional() }) })
        .parse(JSON.parse(stdout)).format.tags ?? {}
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
