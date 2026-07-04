-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgencyPlan" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AgencyRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'CLIENT_VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('MANAGER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VideoAssetStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETION_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('AUDIO', 'RENDERED_CLIP', 'CAPTIONS', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "StorageClass" AS ENUM ('STANDARD', 'STANDARD_IA', 'INTELLIGENT_TIERING', 'GLACIER', 'DEEP_ARCHIVE');

-- CreateEnum
CREATE TYPE "ProcessingStage" AS ENUM ('VALIDATE_MEDIA', 'EXTRACT_AUDIO', 'TRANSCRIBE', 'SCORE_CLIPS');

-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('QUEUED', 'VALIDATING_MEDIA', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'WAITING_FOR_PROVIDER', 'SCORING_CLIPS', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRY_SCHEDULED', 'DELETION_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "JobAttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "UploadSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABORTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UsageUnit" AS ENUM ('VIDEO_STORAGE_GB_HOUR', 'SOURCE_VIDEO_UPLOAD_GB', 'FFMPEG_TASK_SECOND', 'TRANSCRIPTION_AUDIO_MINUTE', 'GEMINI_INPUT_TOKEN', 'GEMINI_OUTPUT_TOKEN', 'CLIP_RENDER_MINUTE', 'DATA_EGRESS_GB');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "AgencyPlan" NOT NULL DEFAULT 'FREE',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "dataRegion" TEXT NOT NULL DEFAULT 'us',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "authSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_users" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'EDITOR',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_memberships" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_assets" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "objectVersion" TEXT,
    "checksumSha256" TEXT,
    "sizeBytes" BIGINT,
    "durationMs" INTEGER,
    "status" "VideoAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_artifacts" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "objectVersion" TEXT,
    "checksumSha256" TEXT,
    "sizeBytes" BIGINT,
    "format" TEXT,
    "storageClass" "StorageClass" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "pipelineVersion" TEXT NOT NULL DEFAULT 'v1',
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "cancellationRequested" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "lastErrorClass" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_job_attempts" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" "ProcessingStage" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "JobAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "idempotencyKey" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "errorClass" TEXT,
    "errorMessage" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_job_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "audioArtifactId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModel" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "transcriptVersion" INTEGER NOT NULL DEFAULT 1,
    "audioArtifactChecksum" TEXT NOT NULL,
    "text" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_words" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_scoring_runs" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "outputSchemaVersion" TEXT NOT NULL,
    "responseMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_scoring_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_candidates" (
    "id" TEXT NOT NULL,
    "scoringRunId" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "multipartUploadId" TEXT NOT NULL,
    "partSizeBytes" INTEGER NOT NULL,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "videoAssetId" TEXT,
    "jobId" TEXT,
    "stage" "ProcessingStage",
    "unit" "UsageUnit" NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "costEstimateUsd" DECIMAL(20,6),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_meters" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "includedQuantity" DECIMAL(24,6) NOT NULL DEFAULT 0,
    "usedQuantity" DECIMAL(24,6) NOT NULL DEFAULT 0,
    "billedQuantity" DECIMAL(24,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "agencyId" TEXT,
    "workspaceId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "agencyId" TEXT,
    "requestHash" TEXT,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agencies_slug_key" ON "agencies"("slug");

-- CreateIndex
CREATE INDEX "agencies_dataRegion_idx" ON "agencies"("dataRegion");

-- CreateIndex
CREATE UNIQUE INDEX "users_authSubject_key" ON "users"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "agency_users_agencyId_status_idx" ON "agency_users"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agency_users_agencyId_userId_key" ON "agency_users"("agencyId", "userId");

-- CreateIndex
CREATE INDEX "workspaces_agencyId_name_idx" ON "workspaces"("agencyId", "name");

-- CreateIndex
CREATE INDEX "workspaces_agencyId_status_idx" ON "workspaces"("agencyId", "status");

-- CreateIndex
CREATE INDEX "workspace_memberships_userId_workspaceId_idx" ON "workspace_memberships"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_memberships_workspaceId_userId_key" ON "workspace_memberships"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "video_assets_workspaceId_createdAt_idx" ON "video_assets"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "video_assets_agencyId_status_idx" ON "video_assets"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_bucket_objectKey_objectVersion_key" ON "video_assets"("bucket", "objectKey", "objectVersion");

-- CreateIndex
CREATE INDEX "media_artifacts_videoAssetId_type_idx" ON "media_artifacts"("videoAssetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "media_artifacts_objectKey_objectVersion_key" ON "media_artifacts"("objectKey", "objectVersion");

-- CreateIndex
CREATE UNIQUE INDEX "processing_jobs_idempotencyKey_key" ON "processing_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "processing_jobs_videoAssetId_status_idx" ON "processing_jobs"("videoAssetId", "status");

-- CreateIndex
CREATE INDEX "processing_jobs_workspaceId_status_idx" ON "processing_jobs"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "processing_job_attempts_idempotencyKey_key" ON "processing_job_attempts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "processing_job_attempts_status_nextAttemptAt_idx" ON "processing_job_attempts"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "processing_job_attempts_jobId_stage_attemptNumber_key" ON "processing_job_attempts"("jobId", "stage", "attemptNumber");

-- CreateIndex
CREATE INDEX "transcripts_videoAssetId_provider_providerModel_idx" ON "transcripts"("videoAssetId", "provider", "providerModel");

-- CreateIndex
CREATE INDEX "transcripts_audioArtifactChecksum_idx" ON "transcripts"("audioArtifactChecksum");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_audioArtifactChecksum_provider_providerModel_la_key" ON "transcripts"("audioArtifactChecksum", "provider", "providerModel", "language", "transcriptVersion");

-- CreateIndex
CREATE INDEX "transcript_words_transcriptId_startMs_idx" ON "transcript_words"("transcriptId", "startMs");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_words_transcriptId_sequence_key" ON "transcript_words"("transcriptId", "sequence");

-- CreateIndex
CREATE INDEX "clip_scoring_runs_transcriptId_promptVersion_model_idx" ON "clip_scoring_runs"("transcriptId", "promptVersion", "model");

-- CreateIndex
CREATE UNIQUE INDEX "clip_scoring_runs_transcriptId_provider_model_promptVersion_key" ON "clip_scoring_runs"("transcriptId", "provider", "model", "promptVersion", "outputSchemaVersion");

-- CreateIndex
CREATE INDEX "clip_candidates_transcriptId_score_idx" ON "clip_candidates"("transcriptId", "score" DESC);

-- CreateIndex
CREATE INDEX "clip_candidates_scoringRunId_rank_idx" ON "clip_candidates"("scoringRunId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "clip_candidates_scoringRunId_startMs_endMs_key" ON "clip_candidates"("scoringRunId", "startMs", "endMs");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_idempotencyKey_key" ON "upload_sessions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "upload_sessions_status_expiresAt_idx" ON "upload_sessions"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "usage_events_agencyId_occurredAt_idx" ON "usage_events"("agencyId", "occurredAt");

-- CreateIndex
CREATE INDEX "usage_events_workspaceId_occurredAt_idx" ON "usage_events"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "usage_events_jobId_idx" ON "usage_events"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_meters_agencyId_billingPeriod_metric_key" ON "usage_meters"("agencyId", "billingPeriod", "metric");

-- CreateIndex
CREATE INDEX "audit_logs_agencyId_createdAt_idx" ON "audit_logs"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_idx" ON "outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_endpoint_key_key" ON "idempotency_keys"("endpoint", "key");

-- AddForeignKey
ALTER TABLE "agency_users" ADD CONSTRAINT "agency_users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_users" ADD CONSTRAINT "agency_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_artifacts" ADD CONSTRAINT "media_artifacts_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_job_attempts" ADD CONSTRAINT "processing_job_attempts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "processing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_audioArtifactId_fkey" FOREIGN KEY ("audioArtifactId") REFERENCES "media_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_words" ADD CONSTRAINT "transcript_words_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_scoring_runs" ADD CONSTRAINT "clip_scoring_runs_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_candidates" ADD CONSTRAINT "clip_candidates_scoringRunId_fkey" FOREIGN KEY ("scoringRunId") REFERENCES "clip_scoring_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

