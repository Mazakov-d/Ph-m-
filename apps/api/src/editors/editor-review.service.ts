import { HttpStatus, Injectable } from "@nestjs/common";
import {
  type AuthUser,
  can,
  type EditorApplicationQuery,
  type EditorDecisionInput,
  type EditorModeration,
  type EditorStatus,
  missingRequiredProofs,
  type Paginated,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { decodeCursor, toPage } from "../common/pagination/cursor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { type StoredObject, StorageService } from "../storage/storage.service.js";
import { toEditorModeration } from "./editors.mapper.js";

const WITH_PSEUDO_AND_IDENTITY = {
  user: { select: { pseudo: true, editorIdentity: true } },
} as const;

// SPEC §2.2 and docs/DECISIONS.md: which statuses each decision may start from.
const ALLOWED_PREVIOUS_STATUSES: Record<EditorDecisionInput["status"], EditorStatus[]> = {
  INDEPENDENT: ["PENDING"],
  CERTIFIED: ["PENDING", "INDEPENDENT"],
  REJECTED: ["PENDING"],
};

/** Moderation of editor applications (SPEC §2.2). */
@Injectable()
export class EditorReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Oldest first, without the applicants the moderator has a conflict of interest with. */
  async list(
    moderator: AuthUser,
    query: EditorApplicationQuery,
  ): Promise<Paginated<EditorModeration>> {
    const conflicts = await this.conflictEditorIds(moderator.id);
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.editorProfile.findMany({
      where: {
        status: query.status,
        userId: { notIn: conflicts },
        ...(after && {
          OR: [
            { createdAt: { gt: after.createdAt } },
            { createdAt: after.createdAt, userId: { gt: after.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
      take: query.limit + 1,
      include: WITH_PSEUDO_AND_IDENTITY,
    });
    const page = toPage(rows, query.limit, (row) => ({ createdAt: row.createdAt, id: row.userId }));
    return { items: page.rows.map(toEditorModeration), nextCursor: page.nextCursor };
  }

  async decide(
    moderator: AuthUser,
    applicantId: string,
    decision: EditorDecisionInput,
  ): Promise<EditorModeration> {
    // SPEC §2.2: CERTIFIED is validated by an ADMIN only.
    if (decision.status === "CERTIFIED" && !can(moderator, "editor.validateCertified")) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Only an admin can certify an editor",
      );
    }
    await this.ensureNoConflict(moderator.id, applicantId);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.editorProfile.findUnique({ where: { userId: applicantId } });
      if (!current) {
        throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No editor application");
      }
      const isValidation = decision.status !== "REJECTED";
      // docs/DECISIONS.md (editor applications): every required proof of the applicant's kind
      // is checked, now or at an earlier validation, before the editor status is given.
      const verifiedProofs = isValidation
        ? [...new Set([...current.verifiedProofs, ...decision.checkedProofs])]
        : current.verifiedProofs;
      const missing = isValidation
        ? missingRequiredProofs(current.applicantType, verifiedProofs)
        : [];
      if (missing.length > 0) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "PROOFS_MISSING",
          `Proofs not checked: ${missing.join(", ")}`,
        );
      }
      // Conditional update (CLAUDE.md §5.3): two moderators cannot both decide.
      const updated = await tx.editorProfile.updateMany({
        where: {
          userId: applicantId,
          status: { in: ALLOWED_PREVIOUS_STATUSES[decision.status] },
        },
        data: {
          status: decision.status,
          rejectionReason: decision.status === "REJECTED" ? decision.rejectionReason : null,
          validatedById: isValidation ? moderator.id : null,
          validatedAt: isValidation ? new Date() : null,
          verifiedProofs,
        },
      });
      if (updated.count !== 1) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "INVALID_STATUS_TRANSITION",
          `Cannot move an application from ${current.status} to ${decision.status}`,
        );
      }
      // docs/DECISIONS.md: the account becomes EDITOR when validated.
      if (isValidation) {
        await tx.user.update({ where: { id: applicantId }, data: { role: "EDITOR" } });
      }
      // SPEC §2.4: every moderation decision is audited, in the same transaction.
      await tx.auditLog.create({
        data: {
          actorId: moderator.id,
          action: "editor.decision",
          targetType: "User",
          targetId: applicantId,
          metadata: {
            from: current.status,
            to: decision.status,
            ...(isValidation && { verifiedProofs }),
            ...(decision.status === "REJECTED" && { rejectionReason: decision.rejectionReason }),
          },
        },
      });
      const record = await tx.editorProfile.findUniqueOrThrow({
        where: { userId: applicantId },
        include: WITH_PSEUDO_AND_IDENTITY,
      });
      return toEditorModeration(record);
    });
  }

  /** docs/DECISIONS.md: documents are only read through the API, and every reading is audited. */
  async readDocument(
    moderator: AuthUser,
    applicantId: string,
    index: number,
  ): Promise<StoredObject> {
    await this.ensureNoConflict(moderator.id, applicantId);
    const identity = await this.prisma.editorIdentity.findUnique({
      where: { userId: applicantId },
    });
    const key = identity?.documentKeys[index];
    if (!key) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such document");
    }
    await this.prisma.auditLog.create({
      data: {
        actorId: moderator.id,
        action: "editor.document.read",
        targetType: "User",
        targetId: applicantId,
        metadata: { documentIndex: index },
      },
    });
    return this.storage.get(key);
  }

  private async conflictEditorIds(moderatorId: string): Promise<string[]> {
    const moderator = await this.prisma.user.findUniqueOrThrow({
      where: { id: moderatorId },
      select: { conflictEditorIds: true },
    });
    return moderator.conflictEditorIds;
  }

  // SPEC §2.3: a moderator never handles a file that concerns them.
  private async ensureNoConflict(moderatorId: string, applicantId: string): Promise<void> {
    const conflicts = await this.conflictEditorIds(moderatorId);
    if (moderatorId === applicantId || conflicts.includes(applicantId)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "CONFLICT_OF_INTEREST",
        "This application concerns you",
      );
    }
  }
}
