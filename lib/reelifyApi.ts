import { apiEnv } from "@/lib/auth/env";
import type { ClipCandidate, ProcessingJob, Transcript, Video } from "@/types/reelify";

export class ReelifyApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`Reelify API error ${status}`);
    this.name = "ReelifyApiError";
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token: string;
  idempotencyKey?: string;
}

async function apiFetch<T>(
  path: string,
  { method = "GET", body, token, idempotencyKey }: ApiFetchOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${apiEnv.apiBase}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let parsedBody: unknown = null;
    try {
      parsedBody = await res.json();
    } catch {
      // non-JSON error body — leave parsedBody null
    }
    throw new ReelifyApiError(res.status, parsedBody);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getHealthz(): Promise<{ status: string }> {
  const res = await fetch(`${apiEnv.apiBase}/v1/healthz`);
  return res.json();
}

export interface UploadSession {
  uploadSessionId: string;
  videoId: string;
  multipartUploadId: string;
  partSizeBytes: number;
  objectKey: string;
  expiresAt: string;
}

export function createUploadSession(
  workspaceId: string,
  input: { filename: string; contentType: string; sizeBytes: number },
  token: string,
  idempotencyKey: string,
): Promise<UploadSession> {
  return apiFetch<UploadSession>(`/v1/workspaces/${workspaceId}/upload-sessions`, {
    method: "POST",
    body: input,
    token,
    idempotencyKey,
  });
}

export function getUploadPartUrls(
  uploadSessionId: string,
  partNumbers: number[],
  token: string,
  idempotencyKey: string,
): Promise<{ parts: { partNumber: number; url: string }[]; expiresInSeconds: number }> {
  return apiFetch(`/v1/upload-sessions/${uploadSessionId}/parts`, {
    method: "POST",
    body: { partNumbers },
    token,
    idempotencyKey,
  });
}

export interface CompleteUploadResult {
  videoId: string;
  status: string;
  processingJobId: string;
  processingStatus: string;
}

export function completeUploadSession(
  uploadSessionId: string,
  parts: { partNumber: number; etag: string }[],
  token: string,
  idempotencyKey: string,
): Promise<CompleteUploadResult> {
  return apiFetch(`/v1/upload-sessions/${uploadSessionId}/complete`, {
    method: "POST",
    body: { parts },
    token,
    idempotencyKey,
  });
}

export function getProcessingJob(jobId: string, token: string): Promise<ProcessingJob> {
  return apiFetch<ProcessingJob>(`/v1/processing-jobs/${jobId}`, { token });
}

export function createProcessingJob(
  videoId: string,
  token: string,
  idempotencyKey: string,
): Promise<{ processingJobId: string; processingStatus: string }> {
  return apiFetch(`/v1/videos/${videoId}/processing-jobs`, {
    method: "POST",
    token,
    idempotencyKey,
  });
}

export async function listWorkspaceVideos(
  workspaceId: string,
  token: string,
): Promise<Video[]> {
  const res = await apiFetch<{ videos: Video[] }>(`/v1/workspaces/${workspaceId}/videos`, {
    token,
  });
  return res.videos;
}

/** 404 means "not ready yet", not an error — resolves to null in that case. */
export async function getVideoTranscript(
  videoId: string,
  token: string,
): Promise<Transcript | null> {
  try {
    return await apiFetch<Transcript>(`/v1/videos/${videoId}/transcript`, { token });
  } catch (err) {
    if (err instanceof ReelifyApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getClipCandidates(
  videoId: string,
  token: string,
): Promise<ClipCandidate[]> {
  const res = await apiFetch<{ candidates: ClipCandidate[] }>(
    `/v1/videos/${videoId}/clip-candidates`,
    { token },
  );
  return res.candidates;
}

/**
 * Raw S3 multipart PUT — deliberately NOT routed through apiFetch (no auth
 * header belongs on a presigned URL, and the response shape is just an ETag
 * header, not JSON). Requires the bucket's CORS config to expose the ETag
 * header to the browser — see the plan's flagged infra follow-ups.
 */
export async function putPartToS3(url: string, blob: Blob): Promise<string> {
  const res = await fetch(url, { method: "PUT", body: blob });
  if (!res.ok) {
    throw new Error(`S3 part upload failed with status ${res.status}`);
  }
  const etag = res.headers.get("ETag");
  if (!etag) {
    throw new Error(
      "S3 PUT response is missing the ETag header — the bucket's CORS config likely needs Expose-Headers: ETag",
    );
  }
  return etag;
}
