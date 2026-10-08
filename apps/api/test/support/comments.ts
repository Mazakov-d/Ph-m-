import type { INestApplication } from "@nestjs/common";
import { type CommentPublic, commentPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";

export function sendComment(
  app: INestApplication<App>,
  token: string,
  postId: string,
  content: string,
  parentId: string | null = null,
) {
  return request(app.getHttpServer())
    .post("/comments")
    .set("Authorization", `Bearer ${token}`)
    .send({ postId, parentId, content });
}

export async function writeComment(
  app: INestApplication<App>,
  token: string,
  postId: string,
  content: string,
  parentId: string | null = null,
): Promise<CommentPublic> {
  const response = await sendComment(app, token, postId, content, parentId).expect(201);
  return commentPublicSchema.parse(response.body);
}
