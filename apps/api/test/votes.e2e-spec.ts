import type { INestApplication } from "@nestjs/common";
import { type PostPublic, postPublicSchema, voteSummaryPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { signUp } from "./support/users.js";

const OPINION = { ...ARTICLE, kind: "OPINION", voteOptions: ["Oui", "Non", "Sans avis"] };
const HOUR = 60 * 60 * 1000;

describe("Votes on opinions (e2e, SPEC §7)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let editorToken: string;
  let opinion: PostPublic;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ({ accessToken: editorToken } = await signUp(app, prisma, "clara", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    }));
    opinion = await publishPost(app, editorToken, OPINION);
  });

  afterAll(async () => {
    await app.close();
  });

  const optionId = (label: string) =>
    opinion.votes?.options.find((option) => option.label === label)?.id ?? "";
  const vote = (token: string, label: string, postId = opinion.id) =>
    request(app.getHttpServer())
      .put(`/posts/${postId}/vote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ optionId: optionId(label) });
  const reveal = (token: string) =>
    request(app.getHttpServer())
      .post(`/posts/${opinion.id}/vote/reveal`)
      .set("Authorization", `Bearer ${token}`);
  const read = async (token?: string) => {
    const call = request(app.getHttpServer()).get(`/posts/${opinion.id}`);
    if (token) call.set("Authorization", `Bearer ${token}`);
    const response = await call.expect(200);
    return { body: response.body, post: postPublicSchema.parse(response.body) };
  };

  describe("voting", () => {
    it("records the vote and shows the totals to the voter", async () => {
      const reader = await signUp(app, prisma, "lea");
      const response = await vote(reader.accessToken, "Oui").expect(200);
      const summary = voteSummaryPublicSchema.parse(response.body);
      expect(summary.myOptionId).toBe(optionId("Oui"));
      expect(summary.results).toEqual({
        totalVotes: 1,
        counts: [
          { optionId: optionId("Oui"), count: 1 },
          { optionId: optionId("Non"), count: 0 },
          { optionId: optionId("Sans avis"), count: 0 },
        ],
      });
    });

    it("makes the vote final: no second vote (SPEC §7)", async () => {
      const reader = await signUp(app, prisma, "lea");
      await vote(reader.accessToken, "Oui").expect(200);
      const response = await vote(reader.accessToken, "Non").expect(409);
      expect(response.body).toMatchObject({ code: "VOTE_ALREADY_CAST" });
      const stored = await prisma.vote.findFirstOrThrow();
      expect(stored.optionId).toBe(optionId("Oui"));
    });

    it("keeps a single vote when two votes arrive at the same moment", async () => {
      const reader = await signUp(app, prisma, "lea");
      const statuses = await Promise.all([
        vote(reader.accessToken, "Oui"),
        vote(reader.accessToken, "Non"),
      ]).then((responses) => responses.map((response) => response.status).sort());
      expect(statuses).toEqual([200, 409]);
      expect(await prisma.vote.count()).toBe(1);
    });

    it("counts each account", async () => {
      for (const [pseudo, label] of [
        ["lea", "Oui"],
        ["hugo", "Oui"],
        ["ines", "Non"],
      ] as const) {
        const reader = await signUp(app, prisma, pseudo);
        await vote(reader.accessToken, label).expect(200);
      }
      const reader = await signUp(app, prisma, "zoe");
      const response = await vote(reader.accessToken, "Sans avis").expect(200);
      expect(response.body.results.totalVotes).toBe(4);
      expect(response.body.results.counts.map((c: { count: number }) => c.count)).toEqual([
        2, 1, 1,
      ]);
    });

    it("refuses a choice of another opinion", async () => {
      const other = await publishPost(app, editorToken, OPINION);
      const reader = await signUp(app, prisma, "lea");
      await request(app.getHttpServer())
        .put(`/posts/${other.id}/vote`)
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .send({ optionId: optionId("Oui") })
        .expect(400);
    });

    it("refuses a vote on an article", async () => {
      const article = await publishPost(app, editorToken);
      const reader = await signUp(app, prisma, "lea");
      const response = await request(app.getHttpServer())
        .put(`/posts/${article.id}/vote`)
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .send({ optionId: optionId("Oui") })
        .expect(409);
      expect(response.body).toMatchObject({ code: "NOT_AN_OPINION" });
    });

    it("refuses an anonymous visitor and a suspended account", async () => {
      await request(app.getHttpServer())
        .put(`/posts/${opinion.id}/vote`)
        .send({ optionId: optionId("Oui") })
        .expect(401);
      const suspended = await signUp(app, prisma, "suspendu", {
        suspendedUntil: new Date(Date.now() + 60_000),
      });
      const response = await vote(suspended.accessToken, "Oui").expect(403);
      expect(response.body).toMatchObject({ code: "ACCOUNT_RESTRICTED" });
    });
  });

  describe("hidden totals (ROADMAP phase 6)", () => {
    it("never sends the totals to a reader who has not voted", async () => {
      const voter = await signUp(app, prisma, "lea");
      await vote(voter.accessToken, "Oui").expect(200);
      const reader = await signUp(app, prisma, "hugo");

      for (const token of [undefined, reader.accessToken]) {
        const { body, post } = await read(token);
        expect(post.votes?.results).toBeNull();
        expect(post.votes?.options.map((option) => option.label)).toEqual([
          "Oui",
          "Non",
          "Sans avis",
        ]);
        expect(JSON.stringify(body)).not.toMatch(/totalVotes|"count"/);
      }
    });

    it("sends the totals once the reader has voted", async () => {
      const reader = await signUp(app, prisma, "lea");
      await vote(reader.accessToken, "Non").expect(200);
      const { post } = await read(reader.accessToken);
      expect(post.votes).toMatchObject({ myOptionId: optionId("Non"), results: { totalVotes: 1 } });
    });

    it("« Voir sans voter » is final: no vote afterwards (SPEC §7)", async () => {
      const reader = await signUp(app, prisma, "hugo");
      await reveal(reader.accessToken).expect(200);
      const response = await vote(reader.accessToken, "Oui").expect(409);
      expect(response.body).toMatchObject({ code: "VOTE_LOCKED_AFTER_REVEAL" });
    });

    it("« Voir sans voter » shows the totals without voting, and is remembered", async () => {
      const voter = await signUp(app, prisma, "lea");
      await vote(voter.accessToken, "Oui").expect(200);
      const reader = await signUp(app, prisma, "hugo");

      const response = await reveal(reader.accessToken).expect(200);
      expect(response.body).toMatchObject({
        myOptionId: null,
        revealedResults: true,
        results: { totalVotes: 1 },
      });
      const { post } = await read(reader.accessToken);
      expect(post.votes?.results?.totalVotes).toBe(1);
    });

    it("lets a suspended account see the totals without voting (docs/DECISIONS.md)", async () => {
      const suspended = await signUp(app, prisma, "suspendu", {
        suspendedUntil: new Date(Date.now() + 60_000),
      });
      await reveal(suspended.accessToken).expect(200);
    });
  });

  it("never changes the order of the feed (ROADMAP phase 6)", async () => {
    const newer = await publishPost(app, editorToken, { ...OPINION, title: "Plus récente" });
    await prisma.post.update({
      where: { id: opinion.id },
      data: { createdAt: new Date(Date.now() - 2 * HOUR) },
    });
    const before = await request(app.getHttpServer()).get("/posts").expect(200);
    for (const pseudo of ["a1", "a2", "a3", "a4", "a5"]) {
      const reader = await signUp(app, prisma, `lecteur-${pseudo}`);
      await vote(reader.accessToken, "Oui").expect(200);
    }
    const after = await request(app.getHttpServer()).get("/posts").expect(200);
    const ids = (body: { items: { id: string }[] }) => body.items.map((post) => post.id);
    expect(ids(after.body)).toEqual(ids(before.body));
    expect(ids(after.body)).toEqual([newer.id, opinion.id]);
  });
});
