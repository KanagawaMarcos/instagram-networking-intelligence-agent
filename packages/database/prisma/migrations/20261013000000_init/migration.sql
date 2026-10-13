-- Initial production schema for Instagram Networking Intelligence Agent.
CREATE TYPE "FollowerStatus" AS ENUM ('KNOWN', 'UNKNOWN');
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'BUSINESS', 'CREATOR', 'UNKNOWN');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "PipelineStatus" AS ENUM ('DISCOVERED', 'ANALYZED', 'SHORTLISTED', 'READY_TO_CONTACT', 'CONTACTED', 'REPLIED', 'RELATIONSHIP_BUILDING', 'CONNECTED', 'ARCHIVED');
CREATE TYPE "ProfessionalCategory" AS ENUM ('TECH_LEADER', 'FOUNDER', 'RECRUITER', 'ENGINEER', 'CREATOR', 'EXECUTIVE', 'COLLABORATOR', 'UNKNOWN');
CREATE TYPE "EvidenceSourceType" AS ENUM ('IMPORT', 'MANUAL', 'INSTAGRAM_GRAPH', 'AUTHORIZED_COMMENT', 'USER_NOTE', 'AI_ASSESSMENT');
CREATE TYPE "InteractionType" AS ENUM ('COMMENT', 'MESSAGE_METADATA', 'MANUAL_NOTE', 'OTHER');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "instagramUsername" TEXT NOT NULL,
  "instagramUserId" TEXT,
  "displayName" TEXT,
  "biography" TEXT,
  "profession" TEXT,
  "jobTitle" TEXT,
  "company" TEXT,
  "professionalInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "accountType" "AccountType" NOT NULL DEFAULT 'UNKNOWN',
  "profileUrl" TEXT,
  "followerStatus" "FollowerStatus" NOT NULL DEFAULT 'UNKNOWN',
  "dataSource" TEXT NOT NULL,
  "profileLastCheckedAt" TIMESTAMP(3),
  "personalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactEvidence" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "sourceType" "EvidenceSourceType" NOT NULL,
  "sourceUrl" TEXT,
  "fieldName" TEXT NOT NULL,
  "observedValue" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactInteraction" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "interactionType" "InteractionType" NOT NULL,
  "externalId" TEXT,
  "content" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NetworkingAssessment" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "category" "ProfessionalCategory" NOT NULL,
  "relevanceScore" INTEGER NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "professionalSummary" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "opportunities" TEXT[] NOT NULL,
  "suggestedApproach" TEXT NOT NULL,
  "suggestedMessage" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "missingInformation" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "modelVersion" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NetworkingAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NetworkingPipeline" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "status" "PipelineStatus" NOT NULL DEFAULT 'DISCOVERED',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "personalNotes" TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NetworkingPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
  "totalRecords" INTEGER NOT NULL DEFAULT 0,
  "importedRecords" INTEGER NOT NULL DEFAULT 0,
  "duplicateRecords" INTEGER NOT NULL DEFAULT 0,
  "invalidRecords" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "totalContacts" INTEGER NOT NULL DEFAULT 0,
  "processedContacts" INTEGER NOT NULL DEFAULT 0,
  "failedContacts" INTEGER NOT NULL DEFAULT 0,
  "cancelledAt" TIMESTAMP(3),
  "tokenUsage" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "actualCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "errorLog" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NetworkingGoalConfig" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goals" TEXT[] NOT NULL,
  "weights" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NetworkingGoalConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Contact_userId_instagramUsername_key" ON "Contact"("userId", "instagramUsername");
CREATE INDEX "Contact_userId_instagramUsername_idx" ON "Contact"("userId", "instagramUsername");
CREATE INDEX "Contact_userId_profession_idx" ON "Contact"("userId", "profession");
CREATE INDEX "Contact_userId_followerStatus_idx" ON "Contact"("userId", "followerStatus");
CREATE INDEX "ContactEvidence_contactId_observedAt_idx" ON "ContactEvidence"("contactId", "observedAt");
CREATE UNIQUE INDEX "ContactInteraction_contactId_externalId_key" ON "ContactInteraction"("contactId", "externalId");
CREATE INDEX "ContactInteraction_contactId_occurredAt_idx" ON "ContactInteraction"("contactId", "occurredAt");
CREATE INDEX "NetworkingAssessment_contactId_analyzedAt_idx" ON "NetworkingAssessment"("contactId", "analyzedAt");
CREATE INDEX "NetworkingAssessment_category_relevanceScore_idx" ON "NetworkingAssessment"("category", "relevanceScore");
CREATE UNIQUE INDEX "NetworkingPipeline_contactId_key" ON "NetworkingPipeline"("contactId");
CREATE INDEX "NetworkingPipeline_status_priority_idx" ON "NetworkingPipeline"("status", "priority");
CREATE INDEX "NetworkingPipeline_nextFollowUpAt_idx" ON "NetworkingPipeline"("nextFollowUpAt");
CREATE INDEX "ImportJob_userId_createdAt_idx" ON "ImportJob"("userId", "createdAt");
CREATE INDEX "AnalysisJob_userId_createdAt_idx" ON "AnalysisJob"("userId", "createdAt");
CREATE INDEX "NetworkingGoalConfig_userId_active_idx" ON "NetworkingGoalConfig"("userId", "active");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactEvidence" ADD CONSTRAINT "ContactEvidence_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingAssessment" ADD CONSTRAINT "NetworkingAssessment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingPipeline" ADD CONSTRAINT "NetworkingPipeline_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NetworkingGoalConfig" ADD CONSTRAINT "NetworkingGoalConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
