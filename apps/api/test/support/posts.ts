import type { INestApplication } from "@nestjs/common";
import { postPublicSchema, type PostPublic } from "@fama/shared";
import sharp from "sharp";
import request from "supertest";
import type { App } from "supertest/types.js";

export const ARTICLE = {
  kind: "ARTICLE",
  title: "Le budget adopté",
  summary: "Les députés ont voté le budget.",
  body: "Texte complet de l'article.",
  sources: ["https://www.assemblee-nationale.fr", "Compte rendu de séance"],
  zone: "FRANCE",
  locality: null,
  theme: "POLITICS",
  commentsEnabled: true,
};

/** A real JPEG carrying EXIF metadata (device make, copyright), 3000 px wide. */
export function jpegWithMetadata(width = 3000): Promise<Buffer> {
  return sharp({ create: { width, height: 60, channels: 3, background: "#336699" } })
    .jpeg()
    .withExif({ IFD0: { Make: "PhoneCo", Copyright: "Photographe" } })
    .toBuffer();
}

export function smallPng(): Promise<Buffer> {
  return sharp({ create: { width: 40, height: 40, channels: 4, background: "#ffffff" } })
    .png()
    .toBuffer();
}

/** Sends the multipart creation request (field `post` + files `images` and `video`). */
export function sendPost(
  app: INestApplication<App>,
  token: string,
  post: object = ARTICLE,
  images: Buffer[] = [],
  video: Buffer | null = null,
) {
  const call = request(app.getHttpServer())
    .post("/posts")
    .set("Authorization", `Bearer ${token}`)
    .field("post", JSON.stringify(post));
  images.forEach((image, index) => call.attach("images", image, `image-${index}`));
  if (video) call.attach("video", video, "video.mov");
  return call;
}

export async function publishPost(
  app: INestApplication<App>,
  token: string,
  post: object = ARTICLE,
): Promise<PostPublic> {
  const response = await sendPost(app, token, post).expect(201);
  return postPublicSchema.parse(response.body);
}
