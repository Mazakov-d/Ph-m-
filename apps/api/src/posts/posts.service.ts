import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AuthUser, CreatePostInput, PostPublic } from "@fama/shared";
import { FILE_EXTENSIONS } from "../common/files/file-type.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { type PostImageType, sanitizeImage } from "./post-images.js";
import { POST_INCLUDE } from "./post-record.js";
import { toPostPublic } from "./posts.mapper.js";

export type UploadedImage = { bytes: Uint8Array; type: PostImageType };

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** SPEC §3: publishes a post with its sources and images (it cannot be modified afterwards). */
  async create(
    author: AuthUser,
    input: CreatePostInput,
    images: UploadedImage[],
  ): Promise<PostPublic> {
    const postId = randomUUID();
    const imageKeys = await this.storeImages(postId, images);
    try {
      const post = await this.prisma.post.create({
        data: {
          id: postId,
          authorId: author.id,
          kind: input.kind,
          title: input.title,
          summary: input.summary,
          body: input.body,
          zone: input.zone,
          region: input.region,
          theme: input.theme,
          // SPEC §3: comments are always enabled on an opinion.
          commentsEnabled: input.kind === "OPINION" || input.commentsEnabled,
          sources: { create: input.sources.map((value, position) => ({ value, position })) },
          images: { create: imageKeys.map((storageKey, position) => ({ storageKey, position })) },
        },
        include: POST_INCLUDE,
      });
      return toPostPublic(post);
    } catch (error) {
      // The post was not saved: its images must not stay in storage.
      await this.storage.delete(imageKeys);
      throw error;
    }
  }

  private async storeImages(postId: string, images: UploadedImage[]): Promise<string[]> {
    const keys: string[] = [];
    try {
      for (const image of images) {
        const sanitized = await sanitizeImage(image.bytes, image.type);
        const key = `post-images/${postId}/${randomUUID()}.${FILE_EXTENSIONS[image.type]}`;
        await this.storage.put(key, sanitized, image.type);
        keys.push(key);
      }
      return keys;
    } catch (error) {
      await this.storage.delete(keys);
      throw error;
    }
  }
}
