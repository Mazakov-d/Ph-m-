-- DropIndex
DROP INDEX "User_pseudo_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3);


-- docs/DECISIONS.md: pseudos stay unique (regardless of case, citext) among the active accounts;
-- deleted accounts are all named « Compte supprimé ». Prisma cannot describe a partial index.
CREATE UNIQUE INDEX "User_pseudo_active_key" ON "User"("pseudo") WHERE "deletedAt" IS NULL;
