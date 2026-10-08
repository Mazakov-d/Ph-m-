import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { requireEnv } from "../config/env.js";

export type StoredObject = { bytes: Uint8Array; contentType: string };

/** Part of a large object (a video), read as a stream; `contentRange` is set for a part. */
export type StoredStream = {
  body: Readable;
  contentType: string;
  contentLength: number;
  contentRange: string | null;
};

/**
 * Private S3-compatible storage (SPEC §2.2: identity documents never get a public URL).
 * Objects are only read back by the API, for authorized users.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3 = new S3Client({
    endpoint: requireEnv("S3_ENDPOINT"),
    region: requireEnv("S3_REGION"),
    // Self-hosted S3 servers address buckets by path, not by sub-domain.
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY"),
      secretAccessKey: requireEnv("S3_SECRET_KEY"),
    },
  });
  private readonly bucket = requireEnv("S3_PRIVATE_BUCKET");

  /** Creates the bucket on first start (a new bucket is private by default). */
  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredObject> {
    const object = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!object.Body || !object.ContentType) {
      throw new Error(`Stored object ${key} has no content`);
    }
    return { bytes: await object.Body.transformToByteArray(), contentType: object.ContentType };
  }

  /**
   * Streams an object, or the part of it asked by an HTTP `Range` header (a video player reads a
   * video in parts, and iOS refuses a video served otherwise).
   */
  async getStream(key: string, range: string | undefined): Promise<StoredStream> {
    const object = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
    );
    if (!(object.Body instanceof Readable) || !object.ContentType) {
      throw new Error(`Stored object ${key} has no content`);
    }
    return {
      body: object.Body,
      contentType: object.ContentType,
      contentLength: object.ContentLength ?? 0,
      contentRange: object.ContentRange ?? null,
    };
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }
}
