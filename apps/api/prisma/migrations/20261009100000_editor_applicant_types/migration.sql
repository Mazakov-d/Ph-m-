-- docs/DECISIONS.md (editor applications): the kind of applicant and its proofs.
-- CreateEnum
CREATE TYPE "EditorApplicantType" AS ENUM ('MEDIA_GROUP', 'JOURNALIST', 'INDEPENDENT', 'SOCIAL_MEDIA');

-- CreateEnum
CREATE TYPE "EditorProof" AS ENUM ('IDENTITY', 'SIRET', 'LEGAL_NOTICE', 'PUBLICATION_DIRECTOR', 'REPRESENTATION', 'PUBLISHED_WORKS', 'ACCOUNT_OWNERSHIP', 'PUBLICATION_LINKS', 'PRESS_CARD', 'CPPAP');

-- AlterTable
ALTER TABLE "EditorProfile" ADD COLUMN     "applicantType" "EditorApplicantType" NOT NULL DEFAULT 'INDEPENDENT',
ADD COLUMN     "cppapNumber" TEXT,
ADD COLUMN     "pressCardNumber" TEXT,
ADD COLUMN     "professionalEmail" TEXT,
ADD COLUMN     "publicationDirector" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "socialAccountUrl" TEXT,
ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verifiedProofs" "EditorProof"[],
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "workLinks" TEXT[];

-- Existing applications get a code too (letters and digits, like domain/editor-proofs.ts).
UPDATE "EditorProfile"
SET "verificationCode" = 'PHEME-' || upper(substr(md5(random()::text || "userId"::text), 1, 6));
ALTER TABLE "EditorProfile" ALTER COLUMN "verificationCode" SET NOT NULL;
-- Arrays are never null.
UPDATE "EditorProfile" SET "workLinks" = '{}' WHERE "workLinks" IS NULL;
UPDATE "EditorProfile" SET "verifiedProofs" = '{}' WHERE "verifiedProofs" IS NULL;
