import { createHash } from "node:crypto";

export type ProcessingStage =
  | "VALIDATE_MEDIA"
  | "EXTRACT_AUDIO"
  | "TRANSCRIBE"
  | "SCORE_CLIPS";

export interface StageIdempotencyParts {
  jobId: string;
  stage: ProcessingStage;
  pipelineVersion: string;
  /**
   * Checksum of the primary INPUT artifact for the stage (e.g. the source
   * video checksum for EXTRACT_AUDIO, or the audio artifact checksum for
   * TRANSCRIBE). Use "none" only when the stage genuinely has no input
   * artifact yet.
   */
  artifactChecksum: string;
}

/**
 * Worker idempotency key: `{job_id}:{stage}:{pipeline_version}:{artifact_checksum}`.
 * At-least-once delivery means a worker may see the same message more than
 * once; keying persisted work on this string makes re-processing a no-op.
 */
export function buildStageIdempotencyKey(parts: StageIdempotencyParts): string {
  const checksum = parts.artifactChecksum || "none";
  return `${parts.jobId}:${parts.stage}:${parts.pipelineVersion}:${checksum}`;
}

/**
 * Deterministic hash of a write-endpoint request body, stored alongside the
 * client-supplied `Idempotency-Key` so a replay with a *different* body can be
 * rejected as a key-reuse conflict.
 */
export function hashRequestBody(body: unknown): string {
  const canonical = typeof body === "string" ? body : JSON.stringify(body ?? null);
  return createHash("sha256").update(canonical).digest("hex");
}
