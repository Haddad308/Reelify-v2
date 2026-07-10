export type QueueClass = "extraction" | "transcription" | "scoring";

export interface DispatcherConfig {
  region: string;
  queueUrls: Record<QueueClass, string>;
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DispatcherConfig {
  return {
    region: env.AWS_REGION ?? "us-east-1",
    queueUrls: {
      extraction: required(env, "SQS_EXTRACTION_QUEUE_URL"),
      transcription: required(env, "SQS_TRANSCRIPTION_QUEUE_URL"),
      scoring: required(env, "SQS_SCORING_QUEUE_URL"),
    },
    pollIntervalMs: Number(env.OUTBOX_POLL_INTERVAL_MS ?? 2000),
    batchSize: Number(env.OUTBOX_BATCH_SIZE ?? 25),
    maxAttempts: Number(env.OUTBOX_MAX_ATTEMPTS ?? 10),
  };
}
