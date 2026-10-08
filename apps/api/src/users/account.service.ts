import { randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { type AuthUser, DELETED_ACCOUNT_PSEUDO } from "@fama/shared";
import { hash, verify } from "argon2";
import { ApiException } from "../common/errors/api.exception.js";
import { PrismaService } from "../prisma/prisma.service.js";

const UNUSABLE_PASSWORD_BYTES = 32;

/** SPEC §10: deleting one's account from the app (Apple requirement). */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * docs/DECISIONS.md: confirmed with the password; the account is anonymized at once and can
   * no longer sign in; its contents stay, signed « Compte supprimé », until the retention purge.
   */
  async delete(user: AuthUser, password: string): Promise<void> {
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verify(account.passwordHash, password))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Wrong password");
    }
    // Nobody knows this random password: the account can never sign in again.
    const unusablePasswordHash = await hash(randomBytes(UNUSABLE_PASSWORD_BYTES).toString("hex"));
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: `deleted-${user.id}@deleted.invalid`,
          pseudo: DELETED_ACCOUNT_PSEUDO,
          passwordHash: unusablePasswordHash,
          conflictEditorIds: [],
          deletedAt: now,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      // docs/DECISIONS.md (push notifications): no phone nor alert stays tied to the account.
      this.prisma.pushToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.alert.deleteMany({ where: { userId: user.id } }),
    ]);
  }
}
