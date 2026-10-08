-- SPEC §7 (docs/DECISIONS.md, 2026-10-08): answer choices of an opinion set by its editor.
-- Existing opinions get the default choices and existing votes move onto them.

-- CreateTable
CREATE TABLE "VoteOption" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "VoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoteOption_postId_position_key" ON "VoteOption"("postId", "position");

-- AddForeignKey
ALTER TABLE "VoteOption" ADD CONSTRAINT "VoteOption_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data: the default choices of every existing opinion (DEFAULT_VOTE_OPTIONS).
INSERT INTO "VoteOption" ("id", "postId", "label", "position")
SELECT gen_random_uuid(), "id", 'D''accord', 0 FROM "Post" WHERE "kind" = 'OPINION'
UNION ALL
SELECT gen_random_uuid(), "id", 'Pas d''accord', 1 FROM "Post" WHERE "kind" = 'OPINION';

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN "optionId" UUID;

-- Data: AGREE → « D'accord » (position 0), DISAGREE → « Pas d'accord » (position 1).
UPDATE "Vote" AS vote
SET "optionId" = option."id"
FROM "VoteOption" AS option
WHERE option."postId" = vote."postId"
  AND option."position" = CASE vote."value" WHEN 'AGREE' THEN 0 WHEN 'DISAGREE' THEN 1 END;

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "value";

-- DropEnum
DROP TYPE "VoteValue";

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VoteOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
