import type { INestApplication } from "@nestjs/common";
import { JURY_SIZE, juryAssignmentPublicSchema, reviewPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import { z } from "zod";
import { JuryTimeoutJob } from "../src/jury/jury-timeout.job.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { publishPost } from "./support/posts.js";
import { readerAged, reportPost } from "./support/reports.js";
import { signUp } from "./support/users.js";

const HOUR = 3_600_000;
const SEVEN_MONTHS_DAYS = 213;
type Account = { id: string; accessToken: string };

describe("Community review by a jury (e2e, SPEC §5.8)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let postId: string;
  let moderator: Account;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    const editor = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    ({ id: postId } = await publishPost(app, editor.accessToken));
    moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = (account: Account) => `Bearer ${account.accessToken}`;

  async function volunteer(pseudo: string, ageInDays = SEVEN_MONTHS_DAYS): Promise<Account> {
    const reader = await readerAged(app, prisma, pseudo, ageInDays);
    await request(server())
      .put("/jury/volunteer")
      .set("Authorization", auth(reader))
      .send({ volunteer: true })
      .expect(200);
    return reader;
  }

  /** Five regular readers report the article: its review opens and the jury is drawn. */
  async function openReview() {
    for (const pseudo of ["signaleur1", "signaleur2", "signaleur3", "signaleur4", "signaleur5"]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, postId).expect(201);
    }
  }

  async function seatOf(juror: Account) {
    const response = await request(server())
      .get("/jury/assignments")
      .set("Authorization", auth(juror))
      .expect(200);
    return z.array(juryAssignmentPublicSchema).parse(response.body)[0];
  }

  function vote(juror: Account, seatId: string, verdict = "FALSE") {
    return request(server())
      .post(`/jury/assignments/${seatId}/vote`)
      .set("Authorization", auth(juror))
      .send({ verdict, source: "https://www.insee.fr", note: null });
  }

  function decide(body: object) {
    return request(server())
      .post(`/moderation/post-reviews/${postId}/verdict`)
      .set("Authorization", auth(moderator))
      .send({ publicNote: "Note", sources: ["https://exemple.fr"], ...body });
  }

  it("draws 7 eligible volunteers, never the others", async () => {
    const jurors = [];
    for (let index = 0; index < JURY_SIZE + 1; index++)
      jurors.push(await volunteer(`jure${index}`));
    const tooRecent = await volunteer("recent", 100);
    const sanctioned = await volunteer("sanctionne");
    await prisma.sanction.create({
      data: {
        userId: sanctioned.id,
        moderatorId: moderator.id,
        type: "WARNING",
      },
    });
    await openReview();

    const seats = await prisma.juryAssignment.findMany({ where: { postId } });
    expect(seats).toHaveLength(JURY_SIZE);
    const drawn = seats.map((seat) => seat.jurorId);
    expect(drawn).not.toContain(tooRecent.id);
    expect(drawn).not.toContain(sanctioned.id);
  });

  it("collects one vote per juror, then lets the moderator decide", async () => {
    const jurors = [await volunteer("jure1"), await volunteer("jure2"), await volunteer("jure3")];
    await openReview();

    const first = jurors[0];
    if (!first) throw new Error("No juror");
    const seat = await seatOf(first);
    expect(seat?.post.id).toBe(postId);
    await decide({ verdict: "FALSE" }).expect(409);

    for (const [index, juror] of jurors.entries()) {
      const current = await seatOf(juror);
      if (!current) throw new Error("No seat");
      await vote(juror, current.id, index < 2 ? "FALSE" : "ACCURATE").expect(204);
    }
    const again = await vote(first, seat?.id ?? "").expect(409);
    expect(again.body.code).toBe("JURY_ALREADY_VOTED");

    const queue = await request(server())
      .get("/moderation/post-reviews")
      .set("Authorization", auth(moderator))
      .expect(200);
    expect(queue.body[0].jury).toMatchObject({ pending: 0 });
    expect(queue.body[0].jury.votes.map((item: { pseudo: string }) => item.pseudo).sort()).toEqual([
      "jure1",
      "jure2",
      "jure3",
    ]);

    // The majority said FALSE: another verdict needs a public explanation.
    const refused = await decide({ verdict: "ACCURATE" }).expect(400);
    expect(refused.body.code).toBe("JURY_DISAGREEMENT_REQUIRED");
    await decide({
      verdict: "ACCURATE",
      juryDisagreement: "La source citée a été corrigée.",
    }).expect(201);

    const publicReview = await request(server()).get(`/posts/${postId}/review`).expect(200);
    const review = reviewPublicSchema.parse(publicReview.body);
    expect(review.jury).toEqual({
      voters: 3,
      distribution: { ACCURATE: 1, MISSING_CONTEXT: 0, MISLEADING: 0, FALSE: 2, UNVERIFIABLE: 0 },
    });
    expect(review.juryDisagreement).toBe("La source citée a été corrigée.");
    expect(JSON.stringify(publicReview.body)).not.toMatch(/jure1|jure2|jure3/);
  });

  it("replaces a late juror once, and refuses a late vote", async () => {
    const late = await volunteer("jure1");
    await openReview();
    const seat = await seatOf(late);
    const replacement = await volunteer("remplacant");
    const job = app.get(JuryTimeoutJob);

    await job.run(new Date(Date.now() + 49 * HOUR));
    const closed = await vote(late, seat?.id ?? "").expect(409);
    expect(closed.body.code).toBe("JURY_DEADLINE_PASSED");
    const replacementSeat = await prisma.juryAssignment.findFirst({
      where: { postId, jurorId: replacement.id },
    });
    expect(replacementSeat).toMatchObject({ status: "PENDING", replacesId: seat?.id });

    // The replacement does not vote either: the seat stays empty.
    await volunteer("troisieme");
    await job.run(new Date(Date.now() + 100 * HOUR));
    expect(await prisma.juryAssignment.count({ where: { postId } })).toBe(2);
    await decide({ verdict: "FALSE" }).expect(201);
  });

  it("lets a reader volunteer and step back", async () => {
    const reader = await signUp(app, prisma, "lecteur");
    const set = (volunteerValue: boolean) =>
      request(server())
        .put("/jury/volunteer")
        .set("Authorization", auth(reader))
        .send({ volunteer: volunteerValue })
        .expect(200);
    expect((await set(true)).body).toEqual({ volunteer: true });
    expect((await set(false)).body).toEqual({ volunteer: false });
    const editor = await signUp(app, prisma, "editeur", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    await request(server())
      .put("/jury/volunteer")
      .set("Authorization", auth(editor))
      .send({ volunteer: true })
      .expect(403);
  });
});
