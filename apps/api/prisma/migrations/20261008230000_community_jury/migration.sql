-- CreateEnum
CREATE TYPE "JuryAssignmentStatus" AS ENUM ('PENDING', 'VOTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'JURY_DUTY';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "juryDisagreement" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "juryVolunteer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "JuryAssignment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "jurorId" UUID NOT NULL,
    "status" "JuryAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "drawnAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMPTZ(3) NOT NULL,
    "verdict" "Verdict",
    "source" TEXT,
    "note" TEXT,
    "votedAt" TIMESTAMPTZ(3),
    "replacesId" UUID,

    CONSTRAINT "JuryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_replacesId_key" ON "JuryAssignment"("replacesId");

-- CreateIndex
CREATE INDEX "JuryAssignment_status_deadline_idx" ON "JuryAssignment"("status", "deadline");

-- CreateIndex
CREATE INDEX "JuryAssignment_jurorId_status_idx" ON "JuryAssignment"("jurorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_postId_jurorId_key" ON "JuryAssignment"("postId", "jurorId");

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_jurorId_fkey" FOREIGN KEY ("jurorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryAssignment" ADD CONSTRAINT "JuryAssignment_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "JuryAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
