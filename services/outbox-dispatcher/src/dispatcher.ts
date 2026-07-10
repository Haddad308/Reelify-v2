import {
  parseQueueMessage,
  serializeQueueMessage,
  type Logger,
  type QueueEventType,
} from "@reelify/shared";
import type { DispatcherConfig, QueueClass } from "./config";

/**
 * Transactional-outbox dispatcher (plan §7, §12). Polls PENDING outbox rows and
 * publishes them to SQS, marking a row DELIVERED only AFTER a successful send.
 * A crash between send and mark re-delivers (at-least-once) — safe because the
 * workers are idempotent.
 */

export const EVENT_TYPE_TO_QUEUE: Record<QueueEventType, QueueClass> = {
  PROCESS_AUDIO: "extraction",
  TRANSCRIBE: "transcription",
  SCORE_CLIPS: "scoring",
};

export function resolveQueueUrl(
  type: QueueEventType,
  queueUrls: Record<QueueClass, string>,
): string {
  const cls = EVENT_TYPE_TO_QUEUE[type];
  const url = queueUrls[cls];
  if (!url) throw new Error(`No queue URL configured for ${type} (${cls})`);
  return url;
}

/** Exponential backoff (capped) for transient SQS-send failures. */
export function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts * 1000, 60_000);
}

export interface OutboxRow {
  id: string;
  payload: unknown;
  attempts: number;
}

export interface OutboxStore {
  claimPending(limit: number, now: Date): Promise<OutboxRow[]>;
  markDelivered(id: string): Promise<void>;
  markRetry(id: string, attempts: number, error: string, availableAt: Date): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface MessageSender {
  send(queueUrl: string, body: string): Promise<void>;
}

export interface DispatcherDeps {
  store: OutboxStore;
  sender: MessageSender;
  logger: Logger;
}

export class OutboxDispatcher {
  private stopping = false;

  constructor(
    private readonly config: DispatcherConfig,
    private readonly deps: DispatcherDeps,
  ) {}

  /** Process one batch; returns the number of successfully delivered events. */
  async tick(now: Date = new Date()): Promise<number> {
    const rows = await this.deps.store.claimPending(this.config.batchSize, now);
    let delivered = 0;

    for (const row of rows) {
      try {
        const message = parseQueueMessage(row.payload);
        const queueUrl = resolveQueueUrl(message.type, this.config.queueUrls);
        await this.deps.sender.send(queueUrl, serializeQueueMessage(message));
        await this.deps.store.markDelivered(row.id);
        delivered += 1;
        this.deps.logger.info("outbox event delivered", { outboxId: row.id, eventType: message.type });
      } catch (err) {
        const attempts = row.attempts + 1;
        const reason = err instanceof Error ? err.message : String(err);
        if (attempts >= this.config.maxAttempts) {
          await this.deps.store.markFailed(row.id, reason);
          this.deps.logger.error("outbox event permanently failed", { outboxId: row.id, attempts });
        } else {
          const availableAt = new Date(now.getTime() + backoffMs(attempts));
          await this.deps.store.markRetry(row.id, attempts, reason, availableAt);
          this.deps.logger.warn("outbox event retry scheduled", { outboxId: row.id, attempts });
        }
      }
    }

    return delivered;
  }

  stop(): void {
    this.stopping = true;
  }

  async run(): Promise<void> {
    this.deps.logger.info("outbox dispatcher started", { batchSize: this.config.batchSize });
    while (!this.stopping) {
      try {
        const delivered = await this.tick();
        // Back off only when idle; drain quickly when there is a backlog.
        if (delivered === 0) await sleep(this.config.pollIntervalMs);
      } catch (err) {
        this.deps.logger.error("outbox tick failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        await sleep(this.config.pollIntervalMs);
      }
    }
    this.deps.logger.info("outbox dispatcher stopped");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
