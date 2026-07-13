import { z } from "zod";

/**
 * SQS message contracts (plan §7). Messages are produced ONLY by the outbox
 * dispatcher (never dual-written from request code) and consumed by workers.
 * Every message carries the identifiers a worker needs to be idempotent and to
 * write back to the correct tenant-scoped rows.
 */

export const QueueEventType = {
  PROCESS_AUDIO: "PROCESS_AUDIO",
  TRANSCRIBE: "TRANSCRIBE",
  SCORE_CLIPS: "SCORE_CLIPS",
} as const;

export type QueueEventType = (typeof QueueEventType)[keyof typeof QueueEventType];

const baseFields = {
  jobId: z.string().min(1),
  attemptId: z.string().min(1),
  videoAssetId: z.string().min(1),
  agencyId: z.string().min(1),
  workspaceId: z.string().min(1),
  pipelineVersion: z.string().min(1),
};

export const ProcessAudioMessage = z.object({
  type: z.literal(QueueEventType.PROCESS_AUDIO),
  ...baseFields,
  sourceObjectKey: z.string().min(1),
  sourceChecksum: z.string().optional(),
});

export const TranscribeMessage = z.object({
  type: z.literal(QueueEventType.TRANSCRIBE),
  ...baseFields,
  audioArtifactId: z.string().min(1),
  audioObjectKey: z.string().min(1),
  audioChecksum: z.string().min(1),
});

export const ScoreClipsMessage = z.object({
  type: z.literal(QueueEventType.SCORE_CLIPS),
  ...baseFields,
  transcriptId: z.string().min(1),
});

export const QueueMessage = z.discriminatedUnion("type", [
  ProcessAudioMessage,
  TranscribeMessage,
  ScoreClipsMessage,
]);

export type ProcessAudioMessage = z.infer<typeof ProcessAudioMessage>;
export type TranscribeMessage = z.infer<typeof TranscribeMessage>;
export type ScoreClipsMessage = z.infer<typeof ScoreClipsMessage>;
export type QueueMessage = z.infer<typeof QueueMessage>;

/** Parse + validate a raw SQS body (JSON string or already-parsed object). */
export function parseQueueMessage(raw: string | unknown): QueueMessage {
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  return QueueMessage.parse(value);
}

export function serializeQueueMessage(message: QueueMessage): string {
  return JSON.stringify(message);
}
