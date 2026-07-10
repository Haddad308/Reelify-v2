/**
 * Typed browser client for the Reelify AWS control-plane API.
 *
 * Reference implementation for the frontend integration — see
 * `docs/FRONTEND_INTEGRATION_GUIDE.md`. Safe to import from app pages/hooks;
 * no dependency on legacy Supabase or FFmpeg routes.
 *
 * Contract (base = NEXT_PUBLIC_API_BASE):
 *  - POST /v1/workspaces/{workspaceId}/upload-sessions
 *  - POST /v1/upload-sessions/{id}/parts
 *  - POST /v1/upload-sessions/{id}/complete
 *  - GET  /v1/processing-jobs/{jobId}
 *  - GET  /v1/videos/{videoId}/transcript          (404 until ready)
 *  - GET  /v1/videos/{videoId}/clip-candidates
 *
 * Every request carries an auth header (dev: `x-reelify-user`, cognito:
 * `Authorization: Bearer ...`). Every write (POST) carries a fresh
 * `Idempotency-Key`.
 */

export type AuthMode = "dev" | "cognito";

export interface ReelifyClientConfig {
  /** API base URL, e.g. "http://localhost:8090" (no trailing slash required). */
  baseUrl: string;
  authMode: AuthMode;
  /** Dev user id (dev mode) or bearer token (cognito mode). */
  credential: string;
}

// ── Response shapes (mirror the backend routes exactly) ──────────────────────

export interface CreateUploadSessionRequest {
  filename: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface CreateUploadSessionResponse {
  uploadSessionId: string;
  videoId: string;
  multipartUploadId: string;
  partSizeBytes: number;
  objectKey: string;
  expiresAt: string;
}

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface GeneratePartsResponse {
  parts: PresignedPart[];
  expiresInSeconds: number;
}

export interface CompletedPart {
  partNumber: number;
  /** S3 ETag, including surrounding quotes, exactly as returned by the PUT. */
  etag: string;
}

export interface CompleteUploadResponse {
  videoId: string;
  status: string;
  processingJobId: string;
  processingStatus: string;
}

export type ProcessingStatus =
  | "QUEUED"
  | "PROCESSING_AUDIO"
  | "TRANSCRIBING"
  | "SCORING_CLIPS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface ProcessingJob {
  id: string;
  videoId: string;
  /** Widened to string so unexpected server transitions never break the UI. */
  status: ProcessingStatus | string;
  pipelineVersion: string;
  cancellationRequested: boolean;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  provider: string;
  model: string;
  language: string;
  durationMs: number;
  wordCount: number;
  text: string;
}

export interface ClipCandidate {
  id: string;
  rank: number;
  score: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  title: string;
  category: string;
}

export interface ClipCandidatesResponse {
  candidates: ClipCandidate[];
}

/** Error carrying the API's `{ error, message }` body plus the HTTP status. */
export class ReelifyApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ReelifyApiError";
    this.status = status;
    this.code = code;
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function authHeaders(config: ReelifyClientConfig): Record<string, string> {
  if (config.authMode === "cognito") {
    return { Authorization: `Bearer ${config.credential}` };
  }
  return { "x-reelify-user": config.credential };
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function parseError(res: Response): Promise<ReelifyApiError> {
  let code = "error";
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string") code = record.error;
      if (typeof record.message === "string") message = record.message;
    }
  } catch {
    // Non-JSON error body: keep the status text.
  }
  return new ReelifyApiError(res.status, code, message);
}

interface JsonRequestOptions {
  method: "GET" | "POST";
  body?: unknown;
  /** Add a fresh Idempotency-Key header (required for writes). */
  idempotent?: boolean;
}

async function jsonRequest(
  config: ReelifyClientConfig,
  path: string,
  options: JsonRequestOptions
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeaders(config) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotent) headers["Idempotency-Key"] = newIdempotencyKey();

  return fetch(`${trimBase(config.baseUrl)}${path}`, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function jsonOk<T>(res: Response): Promise<T> {
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

// ── Client ────────────────────────────────────────────────────────────────────

export interface ReelifyClient {
  config: ReelifyClientConfig;
  createUploadSession(
    workspaceId: string,
    body: CreateUploadSessionRequest
  ): Promise<CreateUploadSessionResponse>;
  generateParts(sessionId: string, partNumbers: number[]): Promise<GeneratePartsResponse>;
  completeUpload(sessionId: string, parts: CompletedPart[]): Promise<CompleteUploadResponse>;
  getProcessingJob(jobId: string): Promise<ProcessingJob>;
  /** Resolves to `null` while the transcript is not ready yet (HTTP 404). */
  getTranscript(videoId: string): Promise<Transcript | null>;
  getClipCandidates(videoId: string): Promise<ClipCandidatesResponse>;
}

export function createReelifyClient(config: ReelifyClientConfig): ReelifyClient {
  return {
    config,

    async createUploadSession(workspaceId, body) {
      const res = await jsonRequest(config, `/v1/workspaces/${encodeURIComponent(workspaceId)}/upload-sessions`, {
        method: "POST",
        body,
        idempotent: true,
      });
      return jsonOk<CreateUploadSessionResponse>(res);
    },

    async generateParts(sessionId, partNumbers) {
      const res = await jsonRequest(config, `/v1/upload-sessions/${encodeURIComponent(sessionId)}/parts`, {
        method: "POST",
        body: { partNumbers },
        idempotent: true,
      });
      return jsonOk<GeneratePartsResponse>(res);
    },

    async completeUpload(sessionId, parts) {
      const res = await jsonRequest(config, `/v1/upload-sessions/${encodeURIComponent(sessionId)}/complete`, {
        method: "POST",
        body: { parts },
        idempotent: true,
      });
      return jsonOk<CompleteUploadResponse>(res);
    },

    async getProcessingJob(jobId) {
      const res = await jsonRequest(config, `/v1/processing-jobs/${encodeURIComponent(jobId)}`, {
        method: "GET",
      });
      return jsonOk<ProcessingJob>(res);
    },

    async getTranscript(videoId) {
      const res = await jsonRequest(config, `/v1/videos/${encodeURIComponent(videoId)}/transcript`, {
        method: "GET",
      });
      if (res.status === 404) {
        // Drain the body so the connection can be reused, then signal "not ready".
        await res.text().catch(() => undefined);
        return null;
      }
      return jsonOk<Transcript>(res);
    },

    async getClipCandidates(videoId) {
      const res = await jsonRequest(config, `/v1/videos/${encodeURIComponent(videoId)}/clip-candidates`, {
        method: "GET",
      });
      return jsonOk<ClipCandidatesResponse>(res);
    },
  };
}

// ── Multipart upload orchestration (browser -> S3 presigned PUT) ───────────────

export type UploadPhase =
  | "creating-session"
  | "presigning"
  | "uploading"
  | "completing"
  | "done";

export interface UploadProgress {
  phase: UploadPhase;
  partsDone: number;
  partsTotal: number;
}

export interface UploadResult {
  session: CreateUploadSessionResponse;
  completion: CompleteUploadResponse;
}

/** Run async `worker` over `items` with at most `limit` in flight at once. */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const size = Math.max(1, Math.min(limit, queue.length));
  const runners = Array.from({ length: size }, async () => {
    for (;;) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Upload a File via S3 multipart: create session -> presign parts ->
 * PUT each slice with ~3-way concurrency -> complete. Reports progress
 * through `onProgress` and returns both the session and completion payloads.
 */
export async function uploadVideo(
  client: ReelifyClient,
  workspaceId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  onProgress?.({ phase: "creating-session", partsDone: 0, partsTotal: 0 });
  const session = await client.createUploadSession(workspaceId, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  const partSize = session.partSizeBytes;
  const partCount = Math.max(1, Math.ceil(file.size / partSize));
  const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);

  onProgress?.({ phase: "presigning", partsDone: 0, partsTotal: partCount });
  const { parts } = await client.generateParts(session.uploadSessionId, partNumbers);

  const completed: CompletedPart[] = [];
  let done = 0;
  onProgress?.({ phase: "uploading", partsDone: 0, partsTotal: partCount });

  await runWithConcurrency(parts, 3, async (part) => {
    const start = (part.partNumber - 1) * partSize;
    const end = Math.min(part.partNumber * partSize, file.size);
    const blob = file.slice(start, end);

    const put = await fetch(part.url, { method: "PUT", body: blob });
    if (!put.ok) {
      throw new ReelifyApiError(put.status, "part_upload_failed", `Part ${part.partNumber} upload failed (HTTP ${put.status}).`);
    }
    const etag = put.headers.get("etag");
    if (!etag) {
      throw new ReelifyApiError(
        0,
        "missing_etag",
        `Part ${part.partNumber}: S3 did not expose an ETag header. Ensure the bucket CORS config includes "Access-Control-Expose-Headers: ETag".`
      );
    }
    completed.push({ partNumber: part.partNumber, etag });
    done += 1;
    onProgress?.({ phase: "uploading", partsDone: done, partsTotal: partCount });
  });

  completed.sort((a, b) => a.partNumber - b.partNumber);

  onProgress?.({ phase: "completing", partsDone: done, partsTotal: partCount });
  const completion = await client.completeUpload(session.uploadSessionId, completed);

  onProgress?.({ phase: "done", partsDone: done, partsTotal: partCount });
  return { session, completion };
}

// ── Small formatting helpers shared with the UI ────────────────────────────────

/** Format milliseconds as mm:ss (minutes zero-padded to 2). */
export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Extract a human-readable message from any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ReelifyApiError) return `${err.message} (${err.code})`;
  if (err instanceof Error) return err.message;
  return String(err);
}
