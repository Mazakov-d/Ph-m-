-- CreateEnum
CREATE TYPE "TicketTopic" AS ENUM ('PROBLEM', 'IDEA', 'EDITOR_ACCOUNT', 'ACCOUNT', 'OTHER');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "topic" "TicketTopic";
