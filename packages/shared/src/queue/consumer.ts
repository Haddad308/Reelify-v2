import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { Logger } from "../telemetry/logger";

/**
 * Minimal at-least-once SQS consumer used by every worker. A message is deleted
 * ONLY after the handler resolves; a thrown handler leaves the message for
 * redrive (and ultimately the DLQ after maxReceiveCount). Handlers must be
 * idempotent (plan §12).
 */
export type MessageHandler = (body: string) => Promise<void>;

export interface SqsConsumerOptions {
  queueUrl: string;
  handler: MessageHandler;
  logger: Logger;
  client: SQSClient;
  waitTimeSeconds?: number;
  maxMessages?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class SqsConsumer {
  private stopping = false;

  constructor(private readonly opts: SqsConsumerOptions) {}

  stop(): void {
    this.stopping = true;
  }

  async run(): Promise<void> {
    const { queueUrl, handler, logger, client } = this.opts;
    logger.info("consumer started", { queueUrl });

    while (!this.stopping) {
      let messages: { Body?: string; ReceiptHandle?: string; MessageId?: string }[] = [];
      try {
        const res = await client.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: this.opts.maxMessages ?? 1,
            WaitTimeSeconds: this.opts.waitTimeSeconds ?? 20,
          }),
        );
        messages = res.Messages ?? [];
      } catch (err) {
        logger.error("sqs receive failed", { error: err instanceof Error ? err.message : String(err) });
        await sleep(1000);
        continue;
      }

      for (const message of messages) {
        if (!message.Body || !message.ReceiptHandle) continue;
        try {
          await handler(message.Body);
          await client.send(
            new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }),
          );
        } catch (err) {
          // Leave the message for redrive/DLQ; do not delete.
          logger.error("handler failed; leaving message for redrive", {
            error: err instanceof Error ? err.message : String(err),
            messageId: message.MessageId,
          });
        }
      }
    }

    logger.info("consumer stopped", { queueUrl });
  }
}
