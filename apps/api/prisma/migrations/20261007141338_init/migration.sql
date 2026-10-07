-- docs/DECISIONS.md: pseudos are unique regardless of case.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('READER', 'EDITOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EditorStatus" AS ENUM ('PENDING', 'INDEPENDENT', 'CERTIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('ARTICLE', 'OPINION');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('FRANCE', 'EUROPE', 'INTERNATIONAL', 'LOCAL');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('POLITICS', 'ECONOMY', 'SOCIAL_MOVEMENTS', 'ENVIRONMENT', 'SCIENCE_HEALTH', 'TECH', 'CULTURE', 'SPORT');

-- CreateEnum
CREATE TYPE "PostReviewStatus" AS ENUM ('NOT_REVIEWED', 'UNDER_REVIEW', 'REVIEWED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('ACCURATE', 'MISSING_CONTEXT', 'MISLEADING', 'FALSE', 'UNVERIFIABLE');

-- CreateEnum
CREATE TYPE "PostReportReason" AS ENUM ('DUBIOUS_SOURCE', 'OUT_OF_CONTEXT_MEDIA', 'FALSE_INFORMATION', 'MISLEADING', 'OTHER');

-- CreateEnum
CREATE TYPE "CommentReportReason" AS ENUM ('INSULT', 'DISCRIMINATION', 'HARASSMENT', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UPHELD', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'UNDER_REVIEW', 'VERIFIED', 'REMOVED', 'DELETED');

-- CreateEnum
CREATE TYPE "DeletedBy" AS ENUM ('AUTHOR', 'MODERATOR');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('AGREE', 'DISAGREE');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('WARNING', 'SUSPENSION_24H', 'SUSPENSION_7D', 'PERMANENT_BAN');

-- CreateEnum
CREATE TYPE "TicketKind" AS ENUM ('SUPPORT', 'EDITOR_CHAT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "pseudo" CITEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'READER',
    "upheldReportCount" INTEGER NOT NULL DEFAULT 0,
    "dismissedReportCount" INTEGER NOT NULL DEFAULT 0,
    "suspendedUntil" TIMESTAMPTZ(3),
    "bannedAt" TIMESTAMPTZ(3),
    "conflictEditorIds" UUID[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorProfile" (
    "userId" UUID NOT NULL,
    "status" "EditorStatus" NOT NULL DEFAULT 'PENDING',
    "editorialLine" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerGroup" TEXT,
    "showIdentityPublicly" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "validatedById" UUID,
    "validatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EditorProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "EditorIdentity" (
    "userId" UUID NOT NULL,
    "legalFirstName" TEXT NOT NULL,
    "legalLastName" TEXT NOT NULL,
    "documentKeys" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorIdentity_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "kind" "PostKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "zone" "Zone" NOT NULL,
    "region" TEXT,
    "theme" "Theme" NOT NULL,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" "PostReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostImage" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSource" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PostSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostView" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID,
    "sessionId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCorrection" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "parentId" UUID,
    "content" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),
    "deletedBy" "DeletedBy",

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "value" "VoteValue",
    "revealedResults" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReport" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" "PostReportReason" NOT NULL,
    "details" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" "CommentReportReason" NOT NULL,
    "details" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "moderatorId" UUID NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "publicNote" TEXT NOT NULL,
    "sources" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorReply" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" UUID NOT NULL,
    "appellantId" UUID NOT NULL,
    "reviewId" UUID,
    "sanctionId" UUID,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "accepted" BOOLEAN,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sanction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "moderatorId" UUID NOT NULL,
    "type" "SanctionType" NOT NULL,
    "commentId" UUID,
    "postId" UUID,
    "reportToPharos" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMPTZ(3),
    "liftedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "kind" "TicketKind" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "openedById" UUID NOT NULL,
    "editorId" UUID,
    "assignedModeratorId" UUID,
    "assignedAt" TIMESTAMPTZ(3),
    "lastModeratorMessageAt" TIMESTAMPTZ(3),
    "lastMessageAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_pseudo_key" ON "User"("pseudo");

-- CreateIndex
CREATE INDEX "Post_createdAt_id_idx" ON "Post"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_postId_position_key" ON "PostImage"("postId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PostSource_postId_position_key" ON "PostSource"("postId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_userId_key" ON "PostView"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_sessionId_key" ON "PostView"("postId", "sessionId");

-- CreateIndex
CREATE INDEX "PostCorrection_postId_idx" ON "PostCorrection"("postId");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_postId_userId_key" ON "Vote"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostReport_postId_status_idx" ON "PostReport"("postId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PostReport_postId_reporterId_key" ON "PostReport"("postId", "reporterId");

-- CreateIndex
CREATE INDEX "CommentReport_commentId_status_idx" ON "CommentReport"("commentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReport_commentId_reporterId_key" ON "CommentReport"("commentId", "reporterId");

-- CreateIndex
CREATE INDEX "Review_postId_idx" ON "Review"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "EditorReply_reviewId_key" ON "EditorReply"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_reviewId_key" ON "Appeal"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_sanctionId_key" ON "Appeal"("sanctionId");

-- CreateIndex
CREATE INDEX "Sanction_userId_createdAt_idx" ON "Sanction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_assignedModeratorId_idx" ON "Ticket"("assignedModeratorId");

-- CreateIndex
CREATE INDEX "Message_ticketId_createdAt_idx" ON "Message"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "EditorProfile" ADD CONSTRAINT "EditorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorProfile" ADD CONSTRAINT "EditorProfile_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorIdentity" ADD CONSTRAINT "EditorIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSource" ADD CONSTRAINT "PostSource_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCorrection" ADD CONSTRAINT "PostCorrection_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorReply" ADD CONSTRAINT "EditorReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorReply" ADD CONSTRAINT "EditorReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_appellantId_fkey" FOREIGN KEY ("appellantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_sanctionId_fkey" FOREIGN KEY ("sanctionId") REFERENCES "Sanction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedModeratorId_fkey" FOREIGN KEY ("assignedModeratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SPEC §5.5 and §6.3: an appeal targets exactly one review or one sanction.
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_exactly_one_target"
    CHECK (("reviewId" IS NULL) <> ("sanctionId" IS NULL));
