import { Prisma, ProcessingJobStatus, type PrismaClient } from "@reelify/db";
import { buildStageIdempotencyKey, ID_PREFIXES, newId } from "@reelify/shared";

/**
 * Job orchestration write path (plan §7). Enqueuing a job inserts the job, its
 * first attempt, and a PROCESS_AUDIO outbox event in ONE transaction — the
 * queue message is derived from the outbox, never dual-written.
 */

export const TERMINAL_JOB_STATUSES: ProcessingJobStatus[] = [
  ProcessingJobStatus.COMPLETED,
  ProcessingJobStatus.FAILED,
  ProcessingJobStatus.CANCELLED,
  ProcessingJobStatus.DELETED,
];

export interface EnqueueParams {
  videoId: string;
  agencyId: string;
  workspaceId: string;
  userId?: string;
  pipelineVersion: string;
  sourceObjectKey: string;
  sourceChecksum?: string;
}

export function findActiveJob(prisma: PrismaClient, videoId: string, pipelineVersion: string) {
  return prisma.processingJob.findFirst({
    where: { videoAssetId: videoId, pipelineVersion, status: { notIn: TERMINAL_JOB_STATUSES } },
    orderBy: { createdAt: "desc" },
  });
}

/** Insert job + first attempt + PROCESS_AUDIO outbox row using a tx client. */
export async function enqueueJobInTx(
  tx: Prisma.TransactionClient,
  params: EnqueueParams,
): Promise<string> {
  const jobId = newId(ID_PREFIXES.job);
  const attemptId = newId(ID_PREFIXES.attempt);
  const checksum = params.sourceChecksum ?? "none";

  await tx.processingJob.create({
    data: {
      id: jobId,
      videoAssetId: params.videoId,
      agencyId: params.agencyId,
      workspaceId: params.workspaceId,
      requestedByUserId: params.userId,
      pipelineVersion: params.pipelineVersion,
      status: ProcessingJobStatus.QUEUED,
    },
  });
  await tx.processingJobAttempt.create({
    data: {
      id: attemptId,
      jobId,
      stage: "EXTRACT_AUDIO",
      attemptNumber: 1,
      status: "STARTED",
      idempotencyKey: buildStageIdempotencyKey({
        jobId,
        stage: "EXTRACT_AUDIO",
        pipelineVersion: params.pipelineVersion,
        artifactChecksum: checksum,
      }),
    },
  });
  await tx.outboxEvent.create({
    data: {
      aggregateType: "processing_job",
      aggregateId: jobId,
      eventType: "PROCESS_AUDIO",
      payload: {
        type: "PROCESS_AUDIO",
        jobId,
        attemptId,
        videoAssetId: params.videoId,
        agencyId: params.agencyId,
        workspaceId: params.workspaceId,
        pipelineVersion: params.pipelineVersion,
        sourceObjectKey: params.sourceObjectKey,
        ...(params.sourceChecksum ? { sourceChecksum: params.sourceChecksum } : {}),
      },
    },
  });

  return jobId;
}

/** Standalone enqueue (own transaction) for the create/reuse-job endpoint. */
export function createJobWithOutbox(prisma: PrismaClient, params: EnqueueParams): Promise<string> {
  return prisma.$transaction((tx) => enqueueJobInTx(tx, params));
}
