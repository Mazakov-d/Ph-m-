import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../../src/prisma/prisma.service.js";
import { signUp } from "./users.js";

const DAY = 24 * 60 * 60 * 1000;

/** A reader whose account is `ageInDays` old (SPEC §5.2: new accounts weigh 0.2). */
export async function readerAged(
  app: INestApplication<App>,
  prisma: PrismaService,
  pseudo: string,
  ageInDays: number,
): Promise<{ id: string; accessToken: string }> {
  const reader = await signUp(app, prisma, pseudo);
  await prisma.user.update({
    where: { id: reader.id },
    data: { createdAt: new Date(Date.now() - ageInDays * DAY) },
  });
  return reader;
}

export function reportPost(
  app: INestApplication<App>,
  token: string,
  postId: string,
  reason = "FALSE_INFORMATION",
  details: string | null = null,
) {
  return request(app.getHttpServer())
    .post(`/posts/${postId}/reports`)
    .set("Authorization", `Bearer ${token}`)
    .send({ reason, details });
}
