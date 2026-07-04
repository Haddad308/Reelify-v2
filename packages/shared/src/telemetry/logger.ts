/**
 * Structured JSON logging (plan §13). Emits one JSON object per line with the
 * standard correlation fields, and NEVER logs raw transcripts, provider tokens,
 * or signed URLs. Redaction is applied to every logged context object.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  jobId?: string;
  attemptId?: string;
  agencyId?: string;
  workspaceId?: string;
  videoAssetId?: string;
  stage?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERN =
  /(authorization|api[-_]?key|xi[-_]?api[-_]?key|secret|token|password|signedurl|presigned|credential|transcript|full_?text|\btext\b)/i;

const REDACTED = "[REDACTED]";

/** True for values that look like presigned URLs or bearer tokens. */
function looksSensitiveValue(value: string): boolean {
  if (/^https?:\/\/[^ ]*[?&](x-amz-|signature|token|sig)=/i.test(value)) return true; // presigned URL
  if (/x-amz-signature|x-amz-credential|amz-security-token/i.test(value)) return true;
  if (/^bearer\s+/i.test(value)) return true;
  if (/^sk_[a-z0-9]/i.test(value)) return true; // ElevenLabs-style key
  return false;
}

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (input == null) return input;
  if (typeof input === "string") return looksSensitiveValue(input) ? REDACTED : input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redact(value, depth + 1);
    }
  }
  return out;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(bound: LogContext): Logger;
}

export interface LoggerOptions {
  service: string;
  base?: LogContext;
  /** Injected for tests; defaults to console. */
  sink?: (level: LogLevel, line: string) => void;
}

const defaultSink = (level: LogLevel, line: string) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? defaultSink;
  const base = options.base ?? {};

  const emit = (level: LogLevel, message: string, context?: LogContext) => {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      message,
      ...(redact({ ...base, ...context }) as Record<string, unknown>),
    };
    sink(level, JSON.stringify(record));
  };

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
    child: (bound) => createLogger({ ...options, base: { ...base, ...bound } }),
  };
}
