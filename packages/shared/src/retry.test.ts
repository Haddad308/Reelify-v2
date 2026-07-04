import { describe, expect, it } from "vitest";
import { classifyError, MAX_ATTEMPTS, nextAttemptDelayMs } from "./retry";

describe("classifyError", () => {
  it("treats 429 as rate-limited and retryable, respecting Retry-After", () => {
    const c = classifyError({ status: 429 });
    expect(c.retryClass).toBe("RATE_LIMITED");
    expect(c.retryable).toBe(true);
    expect(c.respectRetryAfter).toBe(true);
  });

  it("treats 401/403 as fatal (bad credentials)", () => {
    expect(classifyError({ status: 401 }).retryClass).toBe("FATAL");
    expect(classifyError({ status: 403 }).retryable).toBe(false);
  });

  it("treats 5xx as retryable", () => {
    expect(classifyError({ status: 503 }).retryClass).toBe("RETRYABLE");
  });

  it("treats Gemini schema failures as retry-with-repair", () => {
    expect(classifyError({ kind: "SCHEMA_VALIDATION" }).retryClass).toBe("RETRYABLE_REPAIR");
  });

  it("routes oversized input to chunking, not blind retry", () => {
    expect(classifyError({ status: 413 }).retryClass).toBe("NEEDS_CHUNKING");
    expect(classifyError({ kind: "INPUT_TOO_LARGE" }).retryClass).toBe("NEEDS_CHUNKING");
  });

  it("treats network errors as retryable", () => {
    expect(classifyError({ code: "ETIMEDOUT" }).retryClass).toBe("RETRYABLE");
  });

  it("pauses on provider outage", () => {
    expect(classifyError({ kind: "PROVIDER_OUTAGE" }).retryClass).toBe("PAUSE");
  });
});

describe("nextAttemptDelayMs", () => {
  it("returns escalating delays then null at the budget", () => {
    expect(nextAttemptDelayMs(1)).toBe(90_000);
    expect(nextAttemptDelayMs(4)).toBe(7_200_000);
    expect(nextAttemptDelayMs(MAX_ATTEMPTS)).toBeNull();
  });

  it("keeps jittered delays within [0, base)", () => {
    const base = 7_200_000;
    for (let i = 0; i < 20; i += 1) {
      const d = nextAttemptDelayMs(4, { jitter: true })!;
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(base);
    }
  });
});
