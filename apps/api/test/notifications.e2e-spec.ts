import type { INestApplication } from "@nestjs/common";
import { alertPublicSchema } from "@fama/shared";
import request from "supertest";
import type { App } from "supertest/types.js";
import { type PushMessage, PushSender } from "../src/notifications/push-sender.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./support/app.js";
import { writeComment } from "./support/comments.js";
import { truncateAllTables } from "./support/database.js";
import { ARTICLE, publishPost } from "./support/posts.js";
import { readerAged, reportPost } from "./support/reports.js";
import { signUp } from "./support/users.js";

/** Keeps the push notifications instead of sending them. */
class RecordingPushSender extends PushSender {
  readonly sent: PushMessage[] = [];
  async send(messages: PushMessage[]): Promise<void> {
    this.sent.push(...messages);
  }
}

/** Notifications are sent after the answer: waits for them (or a little, to check none came). */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
}

describe("Push notifications (e2e, docs/DECISIONS.md)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sender: RecordingPushSender;

  beforeAll(async () => {
    sender = new RecordingPushSender();
    ({ app, prisma } = await createTestApp([], (builder) =>
      builder.overrideProvider(PushSender).useValue(sender),
    ));
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    sender.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function readerWithPhone(pseudo: string) {
    const reader = await signUp(app, prisma, pseudo);
    await request(server())
      .post("/notifications/push-tokens")
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .send({ token: `ExponentPushToken[${pseudo}]`, platform: "IOS" })
      .expect(204);
    return reader;
  }

  function addAlert(token: string, alert: object) {
    return request(server()).post("/alerts").set("Authorization", `Bearer ${token}`).send(alert);
  }

  const sentTo = (pseudo: string) =>
    sender.sent.filter((message) => message.to === `ExponentPushToken[${pseudo}]`);

  describe("alerts", () => {
    it("are listed, created and deleted by their owner only", async () => {
      const reader = await signUp(app, prisma, "lecteur");
      const other = await signUp(app, prisma, "autre");
      const created = alertPublicSchema.parse(
        (
          await addAlert(reader.accessToken, {
            theme: "SPORT",
            zone: "FRANCE",
            locality: null,
          }).expect(201)
        ).body,
      );
      const list = await request(server())
        .get("/alerts")
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .expect(200);
      expect(list.body).toEqual([created]);
      await request(server())
        .delete(`/alerts/${created.id}`)
        .set("Authorization", `Bearer ${other.accessToken}`)
        .expect(404);
      await request(server())
        .delete(`/alerts/${created.id}`)
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .expect(204);
    });

    it("are limited to 10 per account", async () => {
      const reader = await signUp(app, prisma, "lecteur");
      const themes = ["POLITICS", "ECONOMY", "SOCIAL_MOVEMENTS", "ENVIRONMENT", "SCIENCE_HEALTH"];
      for (const theme of themes) {
        for (const zone of [null, "FRANCE"]) {
          await addAlert(reader.accessToken, { theme, zone, locality: null }).expect(201);
        }
      }
      const response = await addAlert(reader.accessToken, {
        theme: "SPORT",
        zone: null,
        locality: null,
      });
      expect(response.status).toBe(409);
      expect(response.body.code).toBe("ALERTS_LIMIT_REACHED");
    });

    it("need a theme or a zone, and a locality only with LOCAL", async () => {
      const reader = await signUp(app, prisma, "lecteur");
      await addAlert(reader.accessToken, { theme: null, zone: null, locality: null }).expect(400);
      await addAlert(reader.accessToken, {
        theme: null,
        zone: "FRANCE",
        locality: "BRETAGNE",
      }).expect(400);
    });
  });

  describe("a new post", () => {
    it("reaches each reader with a matching alert once, never its author", async () => {
      const editor = await readerWithPhone("editeur");
      await prisma.user.update({ where: { id: editor.id }, data: { role: "EDITOR" } });
      await prisma.editorProfile.create({
        data: {
          userId: editor.id,
          status: "INDEPENDENT",
          editorialLine: "Ligne",
          ownerName: "Nom",
        },
      });
      await addAlert(editor.accessToken, { theme: "POLITICS", zone: null, locality: null }).expect(
        201,
      );
      const fan = await readerWithPhone("fan");
      await addAlert(fan.accessToken, { theme: "POLITICS", zone: null, locality: null }).expect(
        201,
      );
      await addAlert(fan.accessToken, { theme: null, zone: "FRANCE", locality: null }).expect(201);
      const sport = await readerWithPhone("sportif");
      await addAlert(sport.accessToken, { theme: "SPORT", zone: "FRANCE", locality: null }).expect(
        201,
      );

      const post = await publishPost(app, editor.accessToken, {
        ...ARTICLE,
        title: "Le **budget** adopté",
      });
      await settle();

      expect(sentTo("fan")).toEqual([
        {
          to: "ExponentPushToken[fan]",
          title: "editeur",
          body: "Le budget adopté",
          url: `/posts/${post.id}`,
        },
      ]);
      expect(sentTo("sportif")).toEqual([]);
      expect(sentTo("editeur")).toEqual([]);
    });

    it("never reaches a reader who blocked the editor (SPEC §10)", async () => {
      const editor = await signUp(app, prisma, "editeur", {
        role: "EDITOR",
        editorStatus: "INDEPENDENT",
      });
      const reader = await readerWithPhone("lecteur");
      await addAlert(reader.accessToken, { theme: "POLITICS", zone: null, locality: null }).expect(
        201,
      );
      await request(server())
        .post(`/users/${editor.id}/block`)
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .expect(201);
      await publishPost(app, editor.accessToken);
      await settle();
      expect(sentTo("lecteur")).toEqual([]);
    });

    it("stops after 10 alert notifications in 24 hours", async () => {
      const editor = await signUp(app, prisma, "editeur", {
        role: "EDITOR",
        editorStatus: "INDEPENDENT",
      });
      const reader = await readerWithPhone("lecteur");
      await addAlert(reader.accessToken, { theme: "POLITICS", zone: null, locality: null }).expect(
        201,
      );
      await prisma.notification.createMany({
        data: Array.from({ length: 10 }, () => ({ userId: reader.id, kind: "ALERT" as const })),
      });
      await publishPost(app, editor.accessToken);
      await settle();
      expect(sentTo("lecteur")).toEqual([]);
    });

    it("stops reaching a phone once its owner signed out of it", async () => {
      const editor = await signUp(app, prisma, "editeur", {
        role: "EDITOR",
        editorStatus: "INDEPENDENT",
      });
      const reader = await readerWithPhone("lecteur");
      await addAlert(reader.accessToken, { theme: "POLITICS", zone: null, locality: null }).expect(
        201,
      );
      await request(server())
        .post("/notifications/push-tokens/unregister")
        .set("Authorization", `Bearer ${reader.accessToken}`)
        .send({ token: "ExponentPushToken[lecteur]" })
        .expect(204);
      await publishPost(app, editor.accessToken);
      await settle();
      expect(sentTo("lecteur")).toEqual([]);
    });
  });

  it("tells the author of a thread about a reply, not about their own", async () => {
    const editor = await signUp(app, prisma, "editeur", {
      role: "EDITOR",
      editorStatus: "INDEPENDENT",
    });
    const post = await publishPost(app, editor.accessToken);
    const author = await readerWithPhone("auteur");
    const other = await signUp(app, prisma, "hugo");
    const root = await writeComment(app, author.accessToken, post.id, "Premier");
    await writeComment(app, author.accessToken, post.id, "Moi-même", root.id);
    await writeComment(app, other.accessToken, post.id, "Bien vu", root.id);
    await settle();
    expect(sentTo("auteur")).toEqual([
      {
        to: "ExponentPushToken[auteur]",
        title: "Nouvelle réponse à votre commentaire",
        body: "hugo : Bien vu",
        url: `/posts/${post.id}`,
      },
    ]);
  });

  it("tells the editor when their article goes under review, then about the verdict", async () => {
    const editor = await readerWithPhone("editeur");
    await prisma.user.update({ where: { id: editor.id }, data: { role: "EDITOR" } });
    await prisma.editorProfile.create({
      data: { userId: editor.id, status: "INDEPENDENT", editorialLine: "Ligne", ownerName: "Nom" },
    });
    const post = await publishPost(app, editor.accessToken);
    for (const pseudo of ["lecteur1", "lecteur2", "lecteur3", "lecteur4", "lecteur5"]) {
      const reader = await readerAged(app, prisma, pseudo, 90);
      await reportPost(app, reader.accessToken, post.id).expect(201);
    }
    await settle();
    expect(sentTo("editeur").map((message) => message.title)).toEqual([
      "Votre article est en cours d'examen",
    ]);

    const moderator = await signUp(app, prisma, "modo", { role: "MODERATOR" });
    await request(server())
      .post(`/moderation/post-reviews/${post.id}/verdict`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ verdict: "MISLEADING", publicNote: "Note", sources: ["https://exemple.fr"] })
      .expect(201);
    await settle();
    expect(sentTo("editeur").map((message) => message.title)).toEqual([
      "Votre article est en cours d'examen",
      "Verdict sur votre article : trompeur",
    ]);
  });

  it("tells the other participants of a conversation about a new message, never its content", async () => {
    const reader = await readerWithPhone("lecteur");
    const opened = await request(server())
      .post("/tickets")
      .set("Authorization", `Bearer ${reader.accessToken}`)
      .send({ topic: "ACCOUNT", content: "Bonjour" })
      .expect(201);
    const moderator = await readerWithPhone("modo");
    await prisma.user.update({ where: { id: moderator.id }, data: { role: "MODERATOR" } });
    await request(server())
      .post(`/moderation/tickets/${opened.body.id}/assign`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .expect(201);
    await request(server())
      .post(`/tickets/${opened.body.id}/messages`)
      .set("Authorization", `Bearer ${moderator.accessToken}`)
      .send({ content: "Secret" })
      .expect(201);
    await settle();
    expect(sentTo("lecteur")).toEqual([
      {
        to: "ExponentPushToken[lecteur]",
        title: "Nouveau message",
        body: "Une réponse est arrivée dans votre conversation.",
        url: `/tickets/${opened.body.id}`,
      },
    ]);
    expect(sentTo("modo")).toEqual([]);
  });
});
