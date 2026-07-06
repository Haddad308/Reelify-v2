import { createLogger } from "@reelify/shared";
import { describe, expect, it } from "vitest";
import type { DispatcherConfig } from "./config";
import {
  backoffMs,
  EVENT_TYPE_TO_QUEUE,
  OutboxDispatcher,
  resolveQueueUrl,
  type MessageSender,
  type OutboxRow,
  type OutboxStore,
} from "./dispatcher";

const config: DispatcherConfig = {
  region: "us-east-1",
  queueUrls: {
    extraction: "https://sqs/extraction",
    transcription: "https://sqs/transcription",
    scoring: "https://sqs/scoring",
  },
  pollIntervalMs: 10,
  batchSize: 10,
  maxAttempts: 3,
};

const silentLogger = createLogger({ service: "test", sink: () => {} });

function processAudioPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "PROCESS_AUDIO",
    jobId: "job_1",
    attemptId: "att_1",
    videoAssetId: "vid_1",
    agencyId: "ag_1",
    workspaceId: "ws_1",
    pipelineVersion: "v1",
    sourceObjectKey: "originals/ag_1/vid_1/original.mp4",
    ...overrides,
  };
}

class FakeStore implements OutboxStore {
  delivered: string[] = [];
  retried: { id: string; attempts: number }[] = [];
  failed: string[] = [];
  constructor(private rows: OutboxRow[]) {}
  async claimPending(): Promise<OutboxRow[]> {
    const batch = this.rows;
    this.rows = [];
    return batch;
  }
  async markDelivered(id: string) {
    this.delivered.push(id);
  }
  async markRetry(id: string, attempts: number) {
    this.retried.push({ id, attempts });
  }
  async markFailed(id: string) {
    this.failed.push(id);
  }
}

class FakeSender implements MessageSender {
  sent: { queueUrl: string; body: string }[] = [];
  constructor(private failNext = false) {}
  async send(queueUrl: string, body: string) {
    if (this.failNext) throw new Error("sqs unavailable");
    this.sent.push({ queueUrl, body });
  }
}

describe("resolveQueueUrl", () => {
  it("maps event types to the right queue", () => {
    expect(EVENT_TYPE_TO_QUEUE.PROCESS_AUDIO).toBe("extraction");
    expect(resolveQueueUrl("TRANSCRIBE", config.queueUrls)).toBe("https://sqs/transcription");
    expect(resolveQueueUrl("SCORE_CLIPS", config.queueUrls)).toBe("https://sqs/scoring");
  });
});

describe("backoffMs", () => {
  it("grows exponentially and caps at 60s", () => {
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(3)).toBe(8000);
    expect(backoffMs(20)).toBe(60_000);
  });
});

describe("OutboxDispatcher.tick", () => {
  it("delivers a valid event and marks it delivered", async () => {
    const store = new FakeStore([{ id: "obx_1", payload: processAudioPayload(), attempts: 0 }]);
    const sender = new FakeSender();
    const d = new OutboxDispatcher(config, { store, sender, logger: silentLogger });

    const delivered = await d.tick();

    expect(delivered).toBe(1);
    expect(store.delivered).toEqual(["obx_1"]);
    expect(sender.sent[0]!.queueUrl).toBe("https://sqs/extraction");
  });

  it("schedules a retry when the send fails (attempts < max)", async () => {
    const store = new FakeStore([{ id: "obx_2", payload: processAudioPayload(), attempts: 0 }]);
    const sender = new FakeSender(true);
    const d = new OutboxDispatcher(config, { store, sender, logger: silentLogger });

    const delivered = await d.tick();

    expect(delivered).toBe(0);
    expect(store.retried).toEqual([{ id: "obx_2", attempts: 1 }]);
    expect(store.failed).toEqual([]);
  });

  it("marks failed once attempts reach the max", async () => {
    const store = new FakeStore([{ id: "obx_3", payload: processAudioPayload(), attempts: 2 }]);
    const sender = new FakeSender(true);
    const d = new OutboxDispatcher(config, { store, sender, logger: silentLogger });

    await d.tick();

    expect(store.failed).toEqual(["obx_3"]);
  });

  it("retries an invalid payload rather than crashing the loop", async () => {
    const store = new FakeStore([{ id: "obx_4", payload: { type: "NONSENSE" }, attempts: 0 }]);
    const sender = new FakeSender();
    const d = new OutboxDispatcher(config, { store, sender, logger: silentLogger });

    const delivered = await d.tick();

    expect(delivered).toBe(0);
    expect(store.retried[0]!.id).toBe("obx_4");
  });
});
