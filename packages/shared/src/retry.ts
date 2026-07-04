/**
 * Retry classification + backoff cadence (plan §10 retry table, §12).
 *
 * Every worker maps a failure to a RetryClass and asks for the next attempt
 * delay. This keeps retry behavior consistent across the FFmpeg, transcription,
 * and scoring workers and prevents "burn all attempts instantly" loops.
 */

export type RetryClass =
  | "RETRYABLE" // network timeout, provider 5xx — backoff + retry
  | "RATE_LIMITED" // HTTP 429 / quota — respect Retry-After, reduce concurrency
  | "RETRYABLE_REPAIR" // Gemini JSON/schema failure — retry once with repair prompt
  | "PAUSE" // provider outage — pause and retry later, don't burn attempts
  | "NEEDS_CHUNKING" // input too large — structured remediation, not a blind retry
  | "FATAL"; // bad credentials, unsupported media — user-visible / alert

export interface ClassifiedError {
  retryClass: RetryClass;
  retryable: boolean;
  respectRetryAfter: boolean;
  reason: string;
}

export interface ErrorLike {
  status?: number;
  statusCode?: number;
  httpStatus?: number;
  code?: string;
  name?: string;
  message?: string;
  kind?: "SCHEMA_VALIDATION" | "UNSUPPORTED_MEDIA" | "INPUT_TOO_LARGE" | "PROVIDER_OUTAGE";
}

const NETWORK_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "EPIPE",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
]);

function classify(retryClass: RetryClass, reason: string): ClassifiedError {
  return {
    retryClass,
    reason,
    retryable: retryClass === "RETRYABLE" || retryClass === "RATE_LIMITED" || retryClass === "RETRYABLE_REPAIR" || retryClass === "PAUSE",
    respectRetryAfter: retryClass === "RATE_LIMITED",
  };
}

export function classifyError(err: ErrorLike | null | undefined): ClassifiedError {
  if (!err) return classify("RETRYABLE", "unknown error (no detail) — retry conservatively");

  // Explicit application-tagged kinds take precedence.
  switch (err.kind) {
    case "SCHEMA_VALIDATION":
      return classify("RETRYABLE_REPAIR", "provider response failed schema validation");
    case "UNSUPPORTED_MEDIA":
      return classify("FATAL", "unsupported media — user-visible failure");
    case "INPUT_TOO_LARGE":
      return classify("NEEDS_CHUNKING", "input too large — route to chunking strategy");
    case "PROVIDER_OUTAGE":
      return classify("PAUSE", "provider outage — pause and retry later");
  }

  const status = err.status ?? err.statusCode ?? err.httpStatus;

  if (status === 429) return classify("RATE_LIMITED", "HTTP 429 / provider quota");
  if (status === 401 || status === 403) return classify("FATAL", "invalid API credentials — alert");
  if (status === 413) return classify("NEEDS_CHUNKING", "payload too large (413)");
  if (status === 415 || status === 422) return classify("FATAL", "unsupported/unprocessable media");
  if (status !== undefined && status >= 500) return classify("RETRYABLE", `provider ${status}`);
  if (status !== undefined && status >= 400) return classify("FATAL", `client error ${status}`);

  if (err.code && NETWORK_CODES.has(err.code)) return classify("RETRYABLE", `network error ${err.code}`);
  if (err.name === "AbortError") return classify("RETRYABLE", "request aborted/timeout");

  return classify("RETRYABLE", "unclassified error — retry conservatively");
}

/**
 * Recommended cadence (plan §10): immediate, 1–2 min, 5–10 min, 30 min, 2 h,
 * then DLQ. attemptNumber is 1-based (attempt that just failed). Returns the
 * delay before the NEXT attempt, or null when the retry budget is exhausted.
 */
export const MAX_ATTEMPTS = 5;

const BASE_DELAYS_MS = [
  0, // -> attempt 2 style immediate/near-immediate (handled by caller)
  90_000, // ~1.5 min
  480_000, // ~8 min
  1_800_000, // 30 min
  7_200_000, // 2 h
];

export function nextAttemptDelayMs(attemptNumber: number, opts?: { jitter?: boolean }): number | null {
  if (attemptNumber >= MAX_ATTEMPTS) return null; // exhausted -> DLQ / manual review
  const base = BASE_DELAYS_MS[attemptNumber] ?? BASE_DELAYS_MS[BASE_DELAYS_MS.length - 1] ?? 0;
  if (!opts?.jitter) return base;
  // Full jitter to avoid thundering-herd retries.
  return Math.floor(Math.random() * base);
}
