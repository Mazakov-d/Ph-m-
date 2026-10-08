import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { readerAged, reportPost } from "./support/reports.js";
import { signUp } from "./support/users.js";

describe("Reporting a post (e2e, SPEC §5.1–§5.3)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editor: { id: string; accessToken: string };
  let postId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    editor = await signUp(app, prisma, "clara", { role: "EDITOR", editorStatus: "INDEPENDENT" });
    ({ id: postId } = await publishPost(app, editor.accessToken));
  });

  afterAll(async () => {
    await app.close();
  });

  const reviewStatus = async (id = postId) =>
    (await prisma.post.findUniqueOrThrow({ where: { id } })).reviewStatus;

  it("records the report with a weight computed and stored (SPEC §5.2)", async () => {
    const veteran = await readerAged(app, prisma, "ancien", 400);
    await prisma.user.update({
      where: { id: veteran.id },
      data: { upheldReportCount: 8, dismissedReportCount: 2 },
    });
    const response = await reportPost(app, veteran.accessToken, postId, "DUBIOUS_SOURCE").expect(
      201,
    );
    expect(response.body).toMatchObject({ reason: "DUBIOUS_SOURCE" });
    expect(response.body).not.toHaveProperty("weight");
    const stored = await prisma.postReport.findFirstOrThrow();
    expect(stored.weight).toBeCloseTo(0.1 + 1.9 * 0.8);
    expect(stored.status).toBe("PENDING");
  });

  it("5 reports from accounts under 30 days do not open a review (ROADMAP phase 7)", async () => {
    for (const pseudo of ["nouveau1", "nouveau2", "nouveau3", "nouveau4", "nouveau5"]) {
      const newcomer = await readerAged(app, prisma, pseudo, 29);
      await reportPost(app, newcomer.accessToken, postId).expect(201);
    }
    expect(await reviewStatus()).toBe("NOT_REVIEWED");
  });

  it("5 reports from regular readers open a review of a little-read post (ROADMAP phase 7)", async () => {
    for (const pseudo of ["lecteur1", "lecteur2", "lecteur3", "lecteur4"]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, postId).expect(201);
    }
    expect(await reviewStatus()).toBe("NOT_REVIEWED");
    const fifth = await readerAged(app, prisma, "lecteur5", 90);
    await reportPost(app, fifth.accessToken, postId).expect(201);
    expect(await reviewStatus()).toBe("UNDER_REVIEW");
  });

  it("needs 1 % of the readers on a widely read post (SPEC §5.3)", async () => {
    await prisma.post.update({ where: { id: postId }, data: { viewCount: 1000 } });
    for (const pseudo of [
      "lecteur1",
      "lecteur2",
      "lecteur3",
      "lecteur4",
      "lecteur5",
      "lecteur6",
      "lecteur7",
      "lecteur8",
      "lecteur9",
    ]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, postId).expect(201);
    }
    expect(await reviewStatus()).toBe("NOT_REVIEWED");
    const tenth = await readerAged(app, prisma, "lecteur10", 90);
    await reportPost(app, tenth.accessToken, postId).expect(201);
    expect(await reviewStatus()).toBe("UNDER_REVIEW");
  });

  it("opens the review exactly once under concurrent reports", async () => {
    const readers = await Promise.all(
      ["course1", "course2", "course3", "course4", "course5", "course6"].map((pseudo) =>
        readerAged(app, prisma, pseudo, 90),
      ),
    );
    await Promise.all(
      readers.map((reader) => reportPost(app, reader.accessToken, postId).expect(201)),
    );
    expect(await reviewStatus()).toBe("UNDER_REVIEW");
    expect(await prisma.postReport.count()).toBe(6);
  });

  it("accepts only one report per account and post (SPEC §5.1)", async () => {
    const reader = await readerAged(app, prisma, "lea", 90);
    await reportPost(app, reader.accessToken, postId).expect(201);
    const response = await reportPost(app, reader.accessToken, postId, "MISLEADING").expect(409);
    expect(response.body).toMatchObject({ code: "ALREADY_REPORTED" });
  });

  it("refuses a report of one's own post (SPEC §5.1)", async () => {
    const response = await reportPost(app, editor.accessToken, postId).expect(403);
    expect(response.body).toMatchObject({ code: "CANNOT_REPORT_OWN_CONTENT" });
  });

  it("refuses a report of a reviewed article (docs/DECISIONS.md)", async () => {
    await prisma.post.update({ where: { id: postId }, data: { reviewStatus: "REVIEWED" } });
    const reader = await readerAged(app, prisma, "lea", 90);
    const response = await reportPost(app, reader.accessToken, postId).expect(409);
    expect(response.body).toMatchObject({ code: "ALREADY_REVIEWED" });
  });

  it("requires details for OTHER", async () => {
    const reader = await readerAged(app, prisma, "lea", 90);
    await reportPost(app, reader.accessToken, postId, "OTHER").expect(400);
    await reportPost(app, reader.accessToken, postId, "OTHER", "Photo d'un autre événement").expect(
      201,
    );
  });

  it("records reports of an opinion without ever opening a review (docs/DECISIONS.md)", async () => {
    const opinion = await publishPost(app, editor.accessToken, { ...ARTICLE, kind: "OPINION" });
    for (const pseudo of ["opinion1", "opinion2", "opinion3", "opinion4", "opinion5", "opinion6"]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, opinion.id, "OTHER", "Contenu haineux").expect(201);
    }
    expect(await reviewStatus(opinion.id)).toBe("NOT_REVIEWED");
  });

  it("refuses a suspended account and an anonymous visitor", async () => {
    const suspended = await signUp(app, prisma, "suspendu", {
      suspendedUntil: new Date(Date.now() + 60_000),
    });
    await reportPost(app, suspended.accessToken, postId).expect(403);
    await request(app.getHttpServer())
      .post(`/posts/${postId}/reports`)
      .send({ reason: "MISLEADING", details: null })
      .expect(401);
  });

  it("tells the reader in the post detail that they already reported it", async () => {
    const reader = await readerAged(app, prisma, "lea", 90);
    const before = await request(app.getHttpServer())
      .get(`/posts/${postId}`)
      .set("Authorization", `Bearer ${reader.accessToken}`);
    expect(before.body.viewerHasReported).toBe(false);
    await reportPost(app, reader.accessToken, postId).expect(201);
    const after = await request(app.getHttpServer())
      .get(`/posts/${postId}`)
      .set("Authorization", `Bearer ${reader.accessToken}`);
    expect(after.body.viewerHasReported).toBe(true);
  });
});
