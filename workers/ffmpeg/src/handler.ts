import { S3Client } from "@aws-sdk/client-s3";
import { getPrismaClient } from "@reelify/db";
import {
  buildStageIdempotencyKey,
  ID_PREFIXES,
  newId,
  ProcessAudioMessage,
  type Logger,
} from "@reelify/shared";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { FfmpegConfig } from "./config";
import { extractionTimeoutMs, MediaValidationError, runExtraction, runFfprobe } from "./ffmpeg";
import { downloadToFile, headObjectSize, sha256File, uploadFile } from "./s3io";

const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED", "DELETED"];

function audioKey(agencyId: string, workspaceId: string, videoId: string, ext: string): string {
  return `audio/${agencyId}/${workspaceId}/${videoId}/audio.${ext}`;
}

export interface HandlerDeps {
  config: FfmpegConfig;
  s3: S3Client;
  prisma: ReturnType<typeof getPrismaClient>;
  logger: Logger;
}

/** PROCESS_AUDIO handler: download -> ffprobe -> extract -> upload -> persist + enqueue TRANSCRIBE. */
export function createProcessAudioHandler(deps: HandlerDeps) {
  const { config, s3, prisma } = deps;

  return async function handle(body: string): Promise<void> {
    const msg = ProcessAudioMessage.parse(JSON.parse(body));
    const log = deps.logger.child({
      jobId: msg.jobId,
      videoAssetId: msg.videoAssetId,
      agencyId: msg.agencyId,
      stage: "EXTRACT_AUDIO",
    });

    // Idempotency: the API-created attempt guards re-processing on redelivery.
    const attempt = await prisma.processingJobAttempt.findUnique({ where: { id: msg.attemptId } });
    if (attempt && (attempt.status === "SUCCEEDED" || attempt.status === "CANCELLED")) {
      log.info("attempt already terminal; skipping");
      return;
    }

    const job = await prisma.processingJob.findUnique({ where: { id: msg.jobId } });
    if (!job) {
      log.warn("job not found; dropping message");
      return;
    }
    if (TERMINAL.includes(job.status)) {
      log.info("job already terminal; skipping");
      return;
    }
    if (job.cancellationRequested) {
      await prisma.$transaction([
        prisma.processingJobAttempt.update({ where: { id: msg.attemptId }, data: { status: "CANCELLED", finishedAt: new Date() } }),
        prisma.processingJob.update({ where: { id: msg.jobId }, data: { status: "CANCELLED" } }),
      ]);
      log.info("job cancellation requested; marked cancelled");
      return;
    }

    const video = await prisma.videoAsset.findUnique({ where: { id: msg.videoAssetId } });
    if (!video) throw new Error("video asset not found");

    await prisma.processingJob.update({ where: { id: msg.jobId }, data: { status: "PROCESSING_AUDIO" } });

    const jobDir = path.join(config.workDir, msg.jobId);
    const sourcePath = path.join(jobDir, "source");
    const audioPath = path.join(jobDir, `audio.${config.audioExt}`);
    await mkdir(jobDir, { recursive: true });

    try {
      const size = await headObjectSize(s3, video.bucket, video.objectKey);
      if (size > config.maxSourceBytes) {
        throw new MediaValidationError("SOURCE_TOO_LARGE", `source ${size} bytes exceeds limit`);
      }

      await downloadToFile(s3, video.bucket, video.objectKey, sourcePath);

      const probe = await runFfprobe(sourcePath, config.ffprobeBin);
      if (!probe.hasAudio) throw new MediaValidationError("UNSUPPORTED_CODEC", "no audio stream present");
      if (probe.durationSec <= 0) throw new MediaValidationError("CORRUPT_MEDIA", "unknown duration");
      if (probe.durationSec > config.maxDurationSec) {
        throw new MediaValidationError("SOURCE_TOO_LONG", `duration ${probe.durationSec}s exceeds limit`);
      }

      const startedAt = Date.now();
      await runExtraction(sourcePath, audioPath, extractionTimeoutMs(probe.durationSec), config.ffmpegBin);
      const ffmpegSeconds = (Date.now() - startedAt) / 1000;

      const audioChecksum = await sha256File(audioPath);
      const audioSize = (await stat(audioPath)).size;
      const artifactKey = audioKey(msg.agencyId, msg.workspaceId, msg.videoAssetId, config.audioExt);
      const upload = await uploadFile(s3, video.bucket, artifactKey, audioPath, config.audioContentType);

      const nextAttemptId = newId(ID_PREFIXES.attempt);
      await prisma.$transaction(async (tx) => {
        const existing = await tx.mediaArtifact.findFirst({
          where: { videoAssetId: msg.videoAssetId, type: "AUDIO" },
        });
        const artifactId = existing?.id ?? newId(ID_PREFIXES.artifact);
        if (!existing) {
          await tx.mediaArtifact.create({
            data: {
              id: artifactId,
              videoAssetId: msg.videoAssetId,
              agencyId: msg.agencyId,
              type: "AUDIO",
              objectKey: artifactKey,
              objectVersion: upload.versionId ?? null,
              checksumSha256: audioChecksum,
              sizeBytes: BigInt(audioSize),
              format: config.audioExt.toUpperCase(),
              storageClass: "STANDARD",
            },
          });
        }
        await tx.processingJobAttempt.update({
          where: { id: msg.attemptId },
          data: { status: "SUCCEEDED", finishedAt: new Date() },
        });
        await tx.processingJob.update({ where: { id: msg.jobId }, data: { status: "TRANSCRIBING" } });
        await tx.processingJobAttempt.create({
          data: {
            id: nextAttemptId,
            jobId: msg.jobId,
            stage: "TRANSCRIBE",
            attemptNumber: 1,
            status: "STARTED",
            idempotencyKey: buildStageIdempotencyKey({
              jobId: msg.jobId,
              stage: "TRANSCRIBE",
              pipelineVersion: msg.pipelineVersion,
              artifactChecksum: audioChecksum,
            }),
          },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateType: "processing_job",
            aggregateId: msg.jobId,
            eventType: "TRANSCRIBE",
            payload: {
              type: "TRANSCRIBE",
              jobId: msg.jobId,
              attemptId: nextAttemptId,
              videoAssetId: msg.videoAssetId,
              agencyId: msg.agencyId,
              workspaceId: msg.workspaceId,
              pipelineVersion: msg.pipelineVersion,
              audioArtifactId: artifactId,
              audioObjectKey: artifactKey,
              audioChecksum,
            },
          },
        });
        await tx.usageEvent.create({
          data: {
            agencyId: msg.agencyId,
            workspaceId: msg.workspaceId,
            videoAssetId: msg.videoAssetId,
            jobId: msg.jobId,
            stage: "EXTRACT_AUDIO",
            unit: "FFMPEG_TASK_SECOND",
            quantity: ffmpegSeconds,
          },
        });
      });

      log.info("audio extracted and transcription enqueued", {
        durationSec: probe.durationSec,
        audioSizeBytes: audioSize,
      });
    } catch (err) {
      if (err instanceof MediaValidationError) {
        // Fatal: mark failed and ACK (no redrive).
        log.error("media validation failed", { state: err.state });
        await prisma.$transaction([
          prisma.processingJobAttempt.update({
            where: { id: msg.attemptId },
            data: { status: "FAILED_FINAL", finishedAt: new Date(), errorClass: err.state, errorMessage: err.message },
          }),
          prisma.processingJob.update({
            where: { id: msg.jobId },
            data: { status: "FAILED", lastErrorClass: err.state, lastErrorMessage: err.message },
          }),
        ]);
        return;
      }
      // Retryable: record and rethrow so SQS redrives (-> DLQ after maxReceiveCount).
      const message = err instanceof Error ? err.message : String(err);
      await prisma.processingJobAttempt
        .update({
          where: { id: msg.attemptId },
          data: { status: "FAILED_RETRYABLE", errorClass: "FFMPEG_INTERNAL_ERROR", errorMessage: message },
        })
        .catch(() => undefined);
      throw err;
    } finally {
      await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
    }
  };
}
