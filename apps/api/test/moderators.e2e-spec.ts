import type { INestApplication } from "@nestjs/common";
import { authSessionSchema, moderatorModerationSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import { z } from "zod";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { signUp } from "./support/users.js";

describe("Moderator accounts created by an admin (e2e, docs/DECISIONS.md)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const NEW_MODERATOR = {
    pseudo: "modo-nouveau",
    email: "nouveau.modo@phemetest.fr",
    password: "un-mot-de-passe-solide",
  };

  it("lets an admin create a moderator, who signs in with the moderation rights", async () => {
    const admin = await signUp(app, prisma, "direction", { role: "ADMIN" });
    const created = await request(app.getHttpServer())
      .post("/admin/moderators")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send(NEW_MODERATOR)
      .expect(201);
    expect(moderatorModerationSchema.parse(created.body)).toMatchObject({
      pseudo: "modo-nouveau",
      email: "nouveau.modo@phemetest.fr",
    });
    expect(JSON.stringify(created.body)).not.toMatch(/password/i);

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ identifier: NEW_MODERATOR.email, password: NEW_MODERATOR.password })
      .expect(200);
    expect(authSessionSchema.parse(login.body).user.role).toBe("MODERATOR");

    const list = await request(app.getHttpServer())
      .get("/admin/moderators")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(
      z
        .array(moderatorModerationSchema)
        .parse(list.body)
        .map((item) => item.pseudo),
    ).toEqual(["modo-nouveau"]);
    expect(
      await prisma.auditLog.count({ where: { actorId: admin.id, action: "moderator.create" } }),
    ).toBe(1);
  });

  it("refuses a moderator, and a pseudo already taken", async () => {
    const moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    await request(app.getHttpServer())
      .post("/admin/moderators")
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send(NEW_MODERATOR)
      .expect(403);
    const admin = await signUp(app, prisma, "direction", { role: "ADMIN" });
    const taken = await request(app.getHttpServer())
      .post("/admin/moderators")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ ...NEW_MODERATOR, pseudo: "modo" })
      .expect(409);
    expect(taken.body.code).toBe("PSEUDO_TAKEN");
  });
});
