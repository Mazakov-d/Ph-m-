import type { INestApplication } from "@nestjs/common";
import type { EditorStatus, UserRole } from "@fama/shared";
import { authSessionSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../../src/prisma/prisma.service.js";

export const TEST_PASSWORD = "mot-de-passe-solide";

/** A valid e-mail built from any pseudo (« Le Monde » → le.monde@test.fr). */
function emailOf(pseudo: string): string {
  const local = pseudo
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, ".");
  return `${local}@test.fr`;
}

type TestAccount = {
  role?: UserRole;
  editorStatus?: EditorStatus;
  suspendedUntil?: Date;
  bannedAt?: Date;
};

/** Registers an account through the API, adjusts its role, and returns its access token. */
export async function signUp(
  app: INestApplication<App>,
  prisma: PrismaService,
  pseudo: string,
  account: TestAccount = {},
): Promise<{ id: string; accessToken: string }> {
  const response = await request(app.getHttpServer())
    .post("/auth/register")
    .send({ email: emailOf(pseudo), password: TEST_PASSWORD, pseudo })
    .expect(201);
  const session = authSessionSchema.parse(response.body);
  const { id } = session.user;

  await prisma.user.update({
    where: { id },
    data: {
      role: account.role,
      suspendedUntil: account.suspendedUntil,
      bannedAt: account.bannedAt,
    },
  });
  if (account.editorStatus) {
    await prisma.editorProfile.create({
      data: { userId: id, status: account.editorStatus, editorialLine: "Ligne", ownerName: "Nom" },
    });
  }
  return { id, accessToken: session.tokens.accessToken };
}
