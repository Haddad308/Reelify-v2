import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getPrismaClient } from "@reelify/db";
import type { MessageSender, OutboxRow, OutboxStore } from "./dispatcher";

/** OutboxStore backed by the Prisma `outbox_events` table. */
export class PrismaOutboxStore implements OutboxStore {
  private readonly prisma = getPrismaClient();

  async claimPending(limit: number, now: Date): Promise<OutboxRow[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { status: "PENDING", availableAt: { lte: now } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ id: r.id, payload: r.payload, attempts: r.attempts }));
  }

  async markDelivered(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
  }

  async markRetry(id: string, attempts: number, error: string, availableAt: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "PENDING", attempts, lastError: error, availableAt },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "FAILED", lastError: error },
    });
  }
}

/** MessageSender backed by AWS SQS. */
export class SqsMessageSender implements MessageSender {
  constructor(private readonly client: SQSClient) {}

  async send(queueUrl: string, body: string): Promise<void> {
    await this.client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: body }));
  }
}
