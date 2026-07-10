import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { getPrismaClient } from "@reelify/db";
import {
  buildStageIdempotencyKey,
  ID_PREFIXES,
  isUniqueViolation,
  newId,
  TranscribeMessage,
  type Logger,
  type TranscriptionProvider,
} from "@reelify/shared";
import type { TranscriptionWorkerConfig } from "./config";

const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED", "DELETED"];

export interface HandlerDeps {
  config: TranscriptionWorkerConfig;
  s3: S3Client;
  prisma: ReturnType<typeof getPrismaClient>;
  provider: TranscriptionProvider;
  logger: Logger;
}

/** TRANSCRIBE handler: fetch audio -> ElevenLabs -> persist transcript+words -> enqueue SCORE_CLIPS. */
export function createTranscribeHandler(deps: HandlerDeps) {
  const { s3, prisma, provider } = deps;

  return async function handle(body: string): Promise<void> {
    const msg = TranscribeMessage.parse(JSON.parse(body));
    const log = deps.logger.child({ jobId: msg.jobId, agencyId: msg.agencyId, stage: "TRANSCRIBE" });

    const attempt = await prisma.processingJobAttempt.findUnique({ where: { id: msg.attemptId } });
    if (attempt && ["SUCCEEDED", "CANCELLED"].includes(attempt.status)) {
      log.info("attempt already terminal; skipping");
      return;
    }
    const job = await prisma.processingJob.findUnique({ where: { id: msg.jobId } });
    if (!job || TERMINAL.includes(job.status)) return;
    if (job.cancellationRequested) {
      await prisma.processingJobAttempt.update({
        where: { id: msg.attemptId },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      await prisma.processingJob.update({ where: { id: msg.jobId }, data: { status: "CANCELLED" } });
      return;
    }

    // Idempotency: reuse an equivalent transcript if one already exists.
    let transcript = await prisma.transcript.findFirst({
      where: {
        audioArtifactChecksum: msg.audioChecksum,
        provider: provider.provider,
        providerModel: provider.model,
      },
    });

    if (!transcript) {
      const video = await prisma.videoAsset.findUnique({ where: { id: msg.videoAssetId } });
      if (!video) throw new Error("video asset not found");

      const obj = await s3.send(new GetObjectCommand({ Bucket: video.bucket, Key: msg.audioObjectKey }));
      if (!obj.Body) throw new Error("audio artifact body is empty");
      const audio = await obj.Body.transformToByteArray();

      const result = await provider.transcribe({ audio, contentType: "audio/flac" });
      const transcriptId = newId(ID_PREFIXES.transcript);

      try {
        transcript = await prisma.$transaction(async (tx) => {
          const created = await tx.transcript.create({
            data: {
              id: transcriptId,
              videoAssetId: msg.videoAssetId,
              agencyId: msg.agencyId,
              audioArtifactId: msg.audioArtifactId,
              provider: provider.provider,
              providerModel: result.model,
              language: result.language,
              transcriptVersion: 1,
              audioArtifactChecksum: msg.audioChecksum,
              text: result.segments.map((s) => s.text).join(" "),
              durationMs: result.durationMs ?? null,
            },
          });
          if (result.words.length > 0) {
            await tx.transcriptWord.createMany({
              data: result.words.map((w, i) => ({
                transcriptId: created.id,
                sequence: i,
                text: w.text,
                startMs: Math.round(w.start * 1000),
                endMs: Math.round(w.end * 1000),
                confidence: w.confidence ?? null,
              })),
            });
          }
          await tx.usageEvent.create({
            data: {
              agencyId: msg.agencyId,
              workspaceId: msg.workspaceId,
              videoAssetId: msg.videoAssetId,
              jobId: msg.jobId,
              stage: "TRANSCRIBE",
              unit: "TRANSCRIPTION_AUDIO_MINUTE",
              quantity: (result.durationMs ?? 0) / 60000,
            },
          });
          return created;
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        transcript = await prisma.transcript.findFirst({
          where: {
            audioArtifactChecksum: msg.audioChecksum,
            provider: provider.provider,
            providerModel: provider.model,
          },
        });
      }
    } else {
      log.info("reusing existing transcript");
    }

    if (!transcript) throw new Error("transcript unexpectedly missing after persistence");
    const transcriptId = transcript.id;

    // Advance the job and enqueue scoring (attempt + outbox in one tx).
    const nextAttemptId = newId(ID_PREFIXES.attempt);
    await prisma.$transaction(async (tx) => {
      await tx.processingJobAttempt.update({
        where: { id: msg.attemptId },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
      await tx.processingJob.update({ where: { id: msg.jobId }, data: { status: "SCORING_CLIPS" } });
      await tx.processingJobAttempt.create({
        data: {
          id: nextAttemptId,
          jobId: msg.jobId,
          stage: "SCORE_CLIPS",
          attemptNumber: 1,
          status: "STARTED",
          idempotencyKey: buildStageIdempotencyKey({
            jobId: msg.jobId,
            stage: "SCORE_CLIPS",
            pipelineVersion: msg.pipelineVersion,
            artifactChecksum: transcriptId,
          }),
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateType: "processing_job",
          aggregateId: msg.jobId,
          eventType: "SCORE_CLIPS",
          payload: {
            type: "SCORE_CLIPS",
            jobId: msg.jobId,
            attemptId: nextAttemptId,
            videoAssetId: msg.videoAssetId,
            agencyId: msg.agencyId,
            workspaceId: msg.workspaceId,
            pipelineVersion: msg.pipelineVersion,
            transcriptId,
          },
        },
      });
    });

    log.info("transcript persisted; scoring enqueued", { transcriptId });
  };
}
