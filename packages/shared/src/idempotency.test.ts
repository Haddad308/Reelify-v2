import { describe, expect, it } from "vitest";
import { buildStageIdempotencyKey, hashRequestBody } from "./idempotency";

describe("buildStageIdempotencyKey", () => {
  it("produces {jobId}:{stage}:{pipelineVersion}:{checksum}", () => {
    expect(
      buildStageIdempotencyKey({
        jobId: "job_1",
        stage: "TRANSCRIBE",
        pipelineVersion: "v1",
        artifactChecksum: "abc123",
      }),
    ).toBe("job_1:TRANSCRIBE:v1:abc123");
  });

  it("defaults a missing checksum to 'none'", () => {
    expect(
      buildStageIdempotencyKey({
        jobId: "job_1",
        stage: "EXTRACT_AUDIO",
        pipelineVersion: "v1",
        artifactChecksum: "",
      }),
    ).toBe("job_1:EXTRACT_AUDIO:v1:none");
  });
});

describe("hashRequestBody", () => {
  it("is deterministic for equal bodies", () => {
    expect(hashRequestBody({ a: 1, b: 2 })).toBe(hashRequestBody({ a: 1, b: 2 }));
  });
  it("differs for different bodies", () => {
    expect(hashRequestBody({ a: 1 })).not.toBe(hashRequestBody({ a: 2 }));
  });
});
