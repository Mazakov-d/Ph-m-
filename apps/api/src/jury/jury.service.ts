import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  drawJurors,
  isJuryEligible,
  JURY_MIN_ACCOUNT_MONTHS,
  JURY_SIZE,
  type JuryAssignmentPublic,
  type JuryModeration,
  type JuryPublic,
  type JuryVoteInput,
  juryDeadline,
  juryDistribution,
  type Verdict,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { POST_INCLUDE } from "../posts/post-record.js";
import { toPostSummaryPublic } from "../posts/posts.mapper.js";
import { PrismaService } from "../prisma/prisma.service.js";

function monthsBefore(now: Date, months: number): Date {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

/**
 * SPEC §5.8 + docs/DECISIONS.md: the community review. A jury of volunteer readers is drawn for
 * each article under review; each juror votes a verdict with a source within 48 hours; the
 * moderator then gives the final verdict, seeing the votes.
 */
@Injectable()
export class JuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Draws the jury of an article that just went under review (fewer seats if few readers). */
  async drawFor(post: { id: string; authorId: string }, now: Date = new Date()): Promise<void> {
    const jurorIds = await this.drawSeats(post, JURY_SIZE, now);
    await this.createSeats(post.id, jurorIds, now, null);
  }

  /**
   * docs/DECISIONS.md: a juror who did not vote within 48 hours loses the seat, which is given
   * once to another reader while the article is still under review. Called by JuryTimeoutJob.
   */
  async expireLateSeats(now: Date = new Date()): Promise<number> {
    const late = await this.prisma.juryAssignment.findMany({
      where: { status: "PENDING", deadline: { lte: now } },
      include: { post: { select: { id: true, authorId: true, reviewStatus: true } } },
    });
    for (const seat of late) {
      // Conditional update (CLAUDE.md §5.3): a vote arriving at the same moment wins.
      const expired = await this.prisma.juryAssignment.updateMany({
        where: { id: seat.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      const isOriginalSeat = seat.replacesId === null;
      if (expired.count === 1 && isOriginalSeat && seat.post.reviewStatus === "UNDER_REVIEW") {
        const [replacement] = await this.drawSeats(seat.post, 1, now);
        if (replacement) await this.createSeats(seat.post.id, [replacement], now, seat.id);
      }
    }
    return late.length;
  }

  /** The seats of the signed-in reader: to vote first, then the ones already voted. */
  async assignmentsOf(user: AuthUser): Promise<JuryAssignmentPublic[]> {
    const seats = await this.prisma.juryAssignment.findMany({
      where: { jurorId: user.id, status: { in: ["PENDING", "VOTED"] } },
      orderBy: [{ status: "asc" }, { drawnAt: "desc" }],
      include: { post: { include: POST_INCLUDE } },
    });
    return seats.map((seat) => ({
      id: seat.id,
      post: toPostSummaryPublic(seat.post),
      status: seat.status,
      deadline: seat.deadline.toISOString(),
      vote:
        seat.verdict && seat.source
          ? { verdict: seat.verdict, source: seat.source, note: seat.note }
          : null,
    }));
  }

  /** SPEC §5.8: one vote per seat, with a source, before the deadline (conditional update). */
  async vote(user: AuthUser, seatId: string, input: JuryVoteInput, now: Date = new Date()) {
    const voted = await this.prisma.juryAssignment.updateMany({
      where: { id: seatId, jurorId: user.id, status: "PENDING", deadline: { gt: now } },
      data: { status: "VOTED", ...input, votedAt: now },
    });
    if (voted.count === 1) return;
    const seat = await this.prisma.juryAssignment.findFirst({
      where: { id: seatId, jurorId: user.id },
    });
    if (!seat) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such jury seat");
    }
    if (seat.status === "VOTED") {
      throw new ApiException(HttpStatus.CONFLICT, "JURY_ALREADY_VOTED", "Already voted");
    }
    throw new ApiException(HttpStatus.CONFLICT, "JURY_DEADLINE_PASSED", "The vote is closed");
  }

  /** What the moderator sees: the votes with their authors, and the jurors still to vote. */
  async moderationView(postId: string): Promise<JuryModeration | null> {
    const seats = await this.prisma.juryAssignment.findMany({
      where: { postId },
      orderBy: { votedAt: "asc" },
      include: { juror: { select: { pseudo: true } } },
    });
    if (seats.length === 0) return null;
    return {
      pending: seats.filter((seat) => seat.status === "PENDING").length,
      votes: seats.flatMap((seat) =>
        seat.status === "VOTED" && seat.verdict && seat.source && seat.votedAt
          ? [
              {
                pseudo: seat.juror.pseudo,
                verdict: seat.verdict,
                source: seat.source,
                note: seat.note,
                votedAt: seat.votedAt.toISOString(),
              },
            ]
          : [],
      ),
    };
  }

  /** The verdicts of the jury of a post (to compare with the moderator's). */
  async verdictsOf(postId: string): Promise<{ pending: number; verdicts: Verdict[] }> {
    const seats = await this.prisma.juryAssignment.findMany({
      where: { postId, status: { in: ["PENDING", "VOTED"] } },
      select: { status: true, verdict: true },
    });
    return {
      pending: seats.filter((seat) => seat.status === "PENDING").length,
      verdicts: seats.flatMap((seat) => (seat.verdict ? [seat.verdict] : [])),
    };
  }

  /** docs/DECISIONS.md: the public sees how many jurors voted and the split, never who. */
  async publicView(postId: string): Promise<JuryPublic | null> {
    const { verdicts } = await this.verdictsOf(postId);
    if (verdicts.length === 0) return null;
    return { voters: verdicts.length, distribution: juryDistribution(verdicts) };
  }

  async isVolunteer(user: AuthUser): Promise<boolean> {
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { juryVolunteer: true },
    });
    return account.juryVolunteer;
  }

  async setVolunteer(user: AuthUser, volunteer: boolean): Promise<boolean> {
    await this.prisma.user.update({ where: { id: user.id }, data: { juryVolunteer: volunteer } });
    return volunteer;
  }

  /**
   * Eligible readers (SPEC §5.8), never the author, someone who reported the article (a party
   * to it, docs/DECISIONS.md) nor a reader already sitting on its jury; then the draw.
   */
  private async drawSeats(
    post: { id: string; authorId: string },
    count: number,
    now: Date,
  ): Promise<string[]> {
    const candidates = await this.prisma.user.findMany({
      where: {
        juryVolunteer: true,
        role: "READER",
        deletedAt: null,
        id: { not: post.authorId },
        createdAt: { lte: monthsBefore(now, JURY_MIN_ACCOUNT_MONTHS) },
        editorProfile: null,
        postReports: { none: { postId: post.id } },
        juryAssignments: { none: { postId: post.id } },
      },
      select: {
        id: true,
        role: true,
        juryVolunteer: true,
        createdAt: true,
        suspendedUntil: true,
        bannedAt: true,
        // A sanction cancelled on appeal does not count.
        sanctions: {
          where: { liftedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        juryAssignments: { where: { status: "PENDING" }, take: 1, select: { id: true } },
      },
    });
    const eligible = candidates.filter((candidate) =>
      isJuryEligible(
        {
          role: candidate.role,
          hasEditorProfile: false,
          juryVolunteer: candidate.juryVolunteer,
          createdAt: candidate.createdAt,
          lastSanctionAt: candidate.sanctions[0]?.createdAt ?? null,
          hasPendingJury: candidate.juryAssignments.length > 0,
          restricted:
            candidate.bannedAt !== null ||
            (candidate.suspendedUntil !== null && candidate.suspendedUntil > now),
        },
        now,
      ),
    );
    return drawJurors(
      eligible.map((candidate) => candidate.id),
      count,
      Math.random,
    );
  }

  private async createSeats(
    postId: string,
    jurorIds: string[],
    now: Date,
    replacesId: string | null,
  ): Promise<void> {
    if (jurorIds.length === 0) return;
    await this.prisma.juryAssignment.createMany({
      data: jurorIds.map((jurorId) => ({
        postId,
        jurorId,
        drawnAt: now,
        deadline: juryDeadline(now),
        replacesId,
      })),
    });
    this.notifications.fireAndForget(this.notifications.notifyJuryDuty(postId, jurorIds));
  }
}
