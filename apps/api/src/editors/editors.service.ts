import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import type {
  CreateEditorApplicationInput,
  EDITOR_DOCUMENT_TYPES,
  EditorApplicationPublic,
  EditorPublic,
  UpdateEditorProfileInput,
} from "@fama/shared";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { EditorReliabilityService } from "../reliability/editor-reliability.service.js";
import { StorageService } from "../storage/storage.service.js";
import { FILE_EXTENSIONS } from "../common/files/file-type.js";
import { toEditorApplicationPublic, toEditorPublic } from "./editors.mapper.js";

export type IdentityDocument = {
  bytes: Uint8Array;
  type: (typeof EDITOR_DOCUMENT_TYPES)[number];
};

@Injectable()
export class EditorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly reliability: EditorReliabilityService,
  ) {}

  /**
   * SPEC §2.2: request for the editor status → PENDING. A rejected applicant may apply again,
   * which replaces the previous application (docs/DECISIONS.md).
   */
  async apply(
    userId: string,
    input: CreateEditorApplicationInput,
    documents: IdentityDocument[],
  ): Promise<EditorApplicationPublic> {
    const documentKeys = await this.storeDocuments(userId, documents);
    let previousKeys: string[] = [];
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.editorProfile.findUnique({ where: { userId } });
        const profileData = {
          status: "PENDING" as const,
          editorialLine: input.editorialLine,
          ownerName: input.ownerName,
          ownerGroup: input.ownerGroup,
          showIdentityPublicly: input.showIdentityPublicly,
          rejectionReason: null,
          validatedById: null,
          validatedAt: null,
        };
        if (existing) {
          // Conditional update: only a REJECTED application can be replaced (CLAUDE.md §5.3).
          const replaced = await tx.editorProfile.updateMany({
            where: { userId, status: "REJECTED" },
            data: profileData,
          });
          if (replaced.count !== 1) {
            throw new ApiException(
              HttpStatus.CONFLICT,
              "EDITOR_APPLICATION_EXISTS",
              "An application is already pending or accepted",
            );
          }
        } else {
          await tx.editorProfile.create({ data: { userId, ...profileData } });
        }

        const identityData = {
          legalFirstName: input.legalFirstName,
          legalLastName: input.legalLastName,
          documentKeys,
        };
        const previous = await tx.editorIdentity.findUnique({ where: { userId } });
        const identity = await tx.editorIdentity.upsert({
          where: { userId },
          create: { userId, ...identityData },
          update: identityData,
        });
        const profile = await tx.editorProfile.findUniqueOrThrow({ where: { userId } });
        return { profile, identity, previousKeys: previous?.documentKeys ?? [] };
      });
      previousKeys = result.previousKeys;
      return toEditorApplicationPublic(result.profile, result.identity);
    } catch (error) {
      // The application was not saved: its documents must not stay in storage.
      await this.storage.delete(documentKeys);
      throw error;
    } finally {
      // docs/DECISIONS.md: the documents of a replaced application are deleted.
      await this.storage.delete(previousKeys);
    }
  }

  async getMyApplication(userId: string): Promise<EditorApplicationPublic> {
    const profile = await this.prisma.editorProfile.findUnique({
      where: { userId },
      include: { user: { select: { editorIdentity: { select: { documentKeys: true } } } } },
    });
    const identity = profile?.user.editorIdentity;
    if (!profile || !identity) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No editor application");
    }
    return toEditorApplicationPublic(profile, identity);
  }

  /** SPEC §2.2: the editor chooses whether their identity appears on their profile. */
  async updateProfile(
    userId: string,
    input: UpdateEditorProfileInput,
  ): Promise<EditorApplicationPublic> {
    const updated = await this.prisma.editorProfile.updateMany({
      where: { userId },
      data: { showIdentityPublicly: input.showIdentityPublicly },
    });
    if (updated.count !== 1) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No editor application");
    }
    return this.getMyApplication(userId);
  }

  /** SPEC §2.2: only validated editors have a public profile. */
  async getPublicProfile(editorId: string): Promise<EditorPublic> {
    const record = await this.prisma.editorProfile.findFirst({
      // SPEC §10: a deleted account has no public profile any more.
      where: {
        userId: editorId,
        status: { in: ["INDEPENDENT", "CERTIFIED"] },
        user: { deletedAt: null },
      },
      include: { user: { select: { pseudo: true, editorIdentity: true } } },
    });
    if (!record) {
      throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such editor");
    }
    return toEditorPublic(record, await this.reliability.levelFor(editorId));
  }

  private async storeDocuments(userId: string, documents: IdentityDocument[]): Promise<string[]> {
    const keys: string[] = [];
    try {
      for (const document of documents) {
        const key = `editor-documents/${userId}/${randomUUID()}.${FILE_EXTENSIONS[document.type]}`;
        await this.storage.put(key, document.bytes, document.type);
        keys.push(key);
      }
      return keys;
    } catch (error) {
      await this.storage.delete(keys);
      throw error;
    }
  }
}
