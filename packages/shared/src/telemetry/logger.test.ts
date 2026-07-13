import { describe, expect, it } from "vitest";
import { createLogger, redact } from "./logger";

describe("redact", () => {
  it("redacts sensitive keys", () => {
    const out = redact({
      apiKey: "sk_secret",
      authorization: "Bearer xyz",
      nested: { xiApiKey: "abc", transcript: "raw words here" },
      keep: "ok",
    }) as Record<string, any>;
    expect(out.apiKey).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.nested.xiApiKey).toBe("[REDACTED]");
    expect(out.nested.transcript).toBe("[REDACTED]");
    expect(out.keep).toBe("ok");
  });

  it("redacts presigned-URL and bearer/token values even under innocuous keys", () => {
    const presigned = "https://b.s3.amazonaws.com/o?X-Amz-Signature=deadbeef&X-Amz-Credential=x";
    const out = redact({ location: presigned, note: "Bearer abc.def", key: "sk_live_123" }) as Record<
      string,
      any
    >;
    expect(out.location).toBe("[REDACTED]");
    expect(out.note).toBe("[REDACTED]");
    expect(out.key).toBe("[REDACTED]");
  });
});

describe("createLogger", () => {
  it("emits structured JSON with standard fields and redaction", () => {
    const lines: string[] = [];
    const logger = createLogger({
      service: "test-worker",
      sink: (_level, line) => lines.push(line),
    });

    logger.info("started", { jobId: "job_1", apiKey: "sk_should_hide" });

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!);
    expect(record.level).toBe("info");
    expect(record.service).toBe("test-worker");
    expect(record.message).toBe("started");
    expect(record.jobId).toBe("job_1");
    expect(record.apiKey).toBe("[REDACTED]");
    expect(typeof record.timestamp).toBe("string");
  });

  it("child loggers inherit bound context", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "svc", sink: (_l, line) => lines.push(line) }).child({
      jobId: "job_9",
    });
    logger.warn("hmm");
    expect(JSON.parse(lines[0]!).jobId).toBe("job_9");
  });
});
