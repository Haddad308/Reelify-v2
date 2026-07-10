import { SQSClient } from "@aws-sdk/client-sqs";
import { getPrismaClient } from "@reelify/db";
import { createLogger, GeminiClipScoringProvider, SqsConsumer } from "@reelify/shared";
import { loadConfig } from "./config";
import { createScoreClipsHandler } from "./handler";

const config = loadConfig();
const logger = createLogger({ service: "scoring-worker" });

const queueUrl = process.env.SQS_SCORING_QUEUE_URL;
if (!queueUrl) throw new Error("Missing required env var: SQS_SCORING_QUEUE_URL");

const consumer = new SqsConsumer({
  queueUrl,
  client: new SQSClient({ region: config.region }),
  logger,
  handler: createScoreClipsHandler({
    config,
    prisma: getPrismaClient(),
    provider: new GeminiClipScoringProvider({ apiKey: config.geminiApiKey, model: config.model }),
    logger,
  }),
});

process.on("SIGTERM", () => consumer.stop());
process.on("SIGINT", () => consumer.stop());

consumer.run().catch((err) => {
  logger.error("scoring worker crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
