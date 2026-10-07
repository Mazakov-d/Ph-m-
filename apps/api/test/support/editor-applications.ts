import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../../src/prisma/prisma.service.js";
import { signUp } from "./users.js";

export const TEST_PDF = Buffer.from("%PDF-1.4\n% identity card scan\n");

/** Signs a reader up and submits an editor application through the API. */
export async function createApplicant(
  app: INestApplication<App>,
  prisma: PrismaService,
  pseudo: string,
  overrides: { showIdentityPublicly?: boolean } = {},
): Promise<{ id: string; accessToken: string }> {
  const applicant = await signUp(app, prisma, pseudo);
  await request(app.getHttpServer())
    .post("/editors/application")
    .set("Authorization", `Bearer ${applicant.accessToken}`)
    .field(
      "application",
      JSON.stringify({
        legalFirstName: "Camille",
        legalLastName: `Durand-${pseudo}`,
        editorialLine: `Ligne éditoriale de ${pseudo}`,
        ownerName: `Société ${pseudo}`,
        ownerGroup: null,
        showIdentityPublicly: overrides.showIdentityPublicly ?? false,
      }),
    )
    .attach("documents", TEST_PDF, "carte-identite.pdf")
    .expect(201);
  return applicant;
}
