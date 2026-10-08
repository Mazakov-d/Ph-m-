import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  type StoredObject,
  type StoredStream,
  StorageService,
} from "../storage/storage.service.js";
import { convertVideo, extractPoster, probeVideo } from "./post-video.js";

export type StoredVideo = {
  storageKey: string;
  posterKey: string;
  durationSeconds: number;
  width: number;
  height: number;
};

/** docs/DECISIONS.md (videos): checks, cleans, converts, stores and serves the video of a post. */
@Injectable()
export class PostVideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** `uploadedPath` is the file received; it is read, never kept. */
  async store(postId: string, uploadedPath: string): Promise<StoredVideo> {
    const probed = await probeVideo(uploadedPath);
    const workDir = await mkdtemp(join(tmpdir(), "post-video-"));
    const storageKey = `post-videos/${postId}/${randomUUID()}.mp4`;
    const posterKey = `post-videos/${postId}/${randomUUID()}.jpg`;
    try {
      const videoPath = join(workDir, "video.mp4");
      const posterPath = join(workDir, "poster.jpg");
      await convertVideo(uploadedPath, videoPath);
      await extractPoster(videoPath, posterPath);
      await this.storage.put(storageKey, await readFile(videoPath), "video/mp4");
      await this.storage.put(posterKey, await readFile(posterPath), "image/jpeg");
      return { storageKey, posterKey, ...probed };
    } catch (error) {
      await this.storage.delete([storageKey, posterKey]);
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  async remove(video: StoredVideo | null): Promise<void> {
    if (video) await this.storage.delete([video.storageKey, video.posterKey]);
  }

  /** The video of a post, or the part asked by `range`. */
  async readVideo(postId: string, range: string | undefined): Promise<StoredStream> {
    const video = await this.find(postId);
    return this.storage.getStream(video.storageKey, range);
  }

  async readPoster(postId: string): Promise<StoredObject> {
    const video = await this.find(postId);
    return this.storage.get(video.posterKey);
  }

  private async find(postId: string) {
    const video = await this.prisma.postVideo.findUnique({ where: { postId } });
    if (!video) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such video");
    }
    return video;
  }
}
