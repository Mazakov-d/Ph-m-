import { Injectable, Logger } from "@nestjs/common";
import {
  ALERT_NOTIFICATIONS_PER_DAY,
  alertMatchesPost,
  type NotificationKind,
  stripInlineFormatting,
  type Theme,
  type Verdict,
  type Zone,
  MILLISECONDS_PER_DAY,
} from "@fama/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { type PushMessage, PushSender } from "./push-sender.js";
import { NOTIFICATION_TEXTS } from "./texts.js";

type PublishedPost = {
  id: string;
  authorId: string;
  title: string;
  theme: Theme;
  zone: Zone;
  region: string | null;
};

/**
 * docs/DECISIONS.md (push notifications): alerts on new posts, replies to comments, reviews of
 * articles and support messages. Each method is called after the action succeeded and never
 * makes it fail: an error is only logged.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: PushSender,
  ) {}

  /** Runs a notification without waiting for it, so the request answers at once. */
  fireAndForget(task: Promise<void>): void {
    task.catch((error: unknown) => this.logger.error("Notification failed", error));
  }

  /**
   * A new post: the readers with a matching alert, at most once per post, at most
   * ALERT_NOTIFICATIONS_PER_DAY alert notifications per reader over 24 hours; never its author,
   * never a reader who blocked the author (SPEC §10).
   */
  async notifyNewPost(post: PublishedPost, now: Date = new Date()): Promise<void> {
    // The database narrows to the theme and zone; alertMatchesPost decides (region included).
    const alerts = await this.prisma.alert.findMany({
      where: {
        userId: { not: post.authorId },
        AND: [
          { OR: [{ theme: post.theme }, { theme: null }] },
          { OR: [{ zone: post.zone }, { zone: null }] },
        ],
        user: {
          deletedAt: null,
          pushTokens: { some: {} },
          blocks: { none: { blockedId: post.authorId } },
        },
      },
      select: { userId: true, theme: true, zone: true, region: true },
    });
    const readerIds = [
      ...new Set(alerts.filter((alert) => alertMatchesPost(alert, post)).map((a) => a.userId)),
    ];
    const since = new Date(now.getTime() - MILLISECONDS_PER_DAY);
    const recipients: string[] = [];
    for (const userId of readerIds) {
      const sentToday = await this.prisma.notification.count({
        where: { userId, kind: "ALERT", createdAt: { gt: since } },
      });
      if (sentToday < ALERT_NOTIFICATIONS_PER_DAY) recipients.push(userId);
    }
    const author = await this.prisma.user.findUnique({
      where: { id: post.authorId },
      select: { pseudo: true },
    });
    await this.deliver(recipients, "ALERT", post.id, {
      title: author?.pseudo ?? "",
      body: stripInlineFormatting(post.title),
      url: `/posts/${post.id}`,
    });
  }

  /** Someone answered a thread: its author, unless they answer themselves or blocked them. */
  async notifyCommentReply(
    rootAuthorId: string,
    reply: { authorId: string; authorPseudo: string; content: string; postId: string },
  ): Promise<void> {
    if (rootAuthorId === reply.authorId) return;
    const blocked = await this.prisma.block.findFirst({
      where: { blockerId: rootAuthorId, blockedId: reply.authorId },
    });
    if (blocked) return;
    await this.deliver([rootAuthorId], "COMMENT_REPLY", reply.postId, {
      title: NOTIFICATION_TEXTS.commentReply,
      body: `${reply.authorPseudo} : ${reply.content}`,
      url: `/posts/${reply.postId}`,
    });
  }

  /** SPEC §5.3: the editor's article went under review. */
  async notifyPostUnderReview(post: { id: string; authorId: string; title: string }) {
    await this.deliver([post.authorId], "POST_UNDER_REVIEW", post.id, {
      title: NOTIFICATION_TEXTS.underReview,
      body: stripInlineFormatting(post.title),
      url: `/posts/${post.id}`,
    });
  }

  /** SPEC §5.4: a verdict (or a verdict on appeal) on the editor's article. */
  async notifyVerdict(post: { id: string; authorId: string; title: string }, verdict: Verdict) {
    await this.deliver([post.authorId], "POST_VERDICT", post.id, {
      title: NOTIFICATION_TEXTS.verdict(verdict),
      body: stripInlineFormatting(post.title),
      url: `/posts/${post.id}`,
    });
  }

  /** SPEC §8: a message in a conversation, for its other participants (never its content). */
  async notifyTicketMessage(ticketId: string, participantIds: string[], authorId: string) {
    const recipients = [...new Set(participantIds)].filter((id) => id !== authorId);
    await this.deliver(recipients, "TICKET_MESSAGE", null, {
      title: NOTIFICATION_TEXTS.ticketMessage,
      body: NOTIFICATION_TEXTS.ticketMessageBody,
      url: `/tickets/${ticketId}`,
    });
  }

  /** SPEC §5.8: the readers drawn for the jury of an article (its title is shown in the app). */
  async notifyJuryDuty(postId: string, jurorIds: string[]): Promise<void> {
    await this.deliver(jurorIds, "JURY_DUTY", postId, {
      title: NOTIFICATION_TEXTS.juryDuty,
      body: NOTIFICATION_TEXTS.juryDutyBody,
      url: "/jury",
    });
  }

  /** Records the notification of each recipient and sends it to all their phones. */
  private async deliver(
    userIds: string[],
    kind: NotificationKind,
    postId: string | null,
    content: Omit<PushMessage, "to">,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds }, user: { deletedAt: null } },
      select: { userId: true, token: true },
    });
    const reached = [...new Set(tokens.map((token) => token.userId))];
    if (reached.length === 0) return;
    await this.prisma.notification.createMany({
      data: reached.map((userId) => ({ userId, kind, postId })),
    });
    await this.sender.send(tokens.map((token) => ({ to: token.token, ...content })));
  }
}
